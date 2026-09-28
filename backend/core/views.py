from rest_framework_mongoengine import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import Student, ViolationReport, ETicket, TimeLog, SystemUser, ServiceSite, utc_now
from .serializers import StudentSerializer, ViolationReportSerializer, ETicketSerializer, TimeLogSerializer
from .passwords import hash_password, verify_password, check_and_upgrade
from mongoengine.errors import ValidationError as MongoValidationError
from bson.errors import InvalidId
import datetime
import re
from django.core.mail import send_mail
from django.conf import settings
import os



@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate user against SystemUser or Student collection"""
    username = request.data.get('username', '').strip()
    password = request.data.get('password')
    
    if not username or not password:
        return Response({"error": "Username and password required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check SystemUser first (admin, guard, staff)
    user = SystemUser.objects.filter(username__iexact=username).first()
    if user and user.is_active is not False:
        if check_and_upgrade(user, password):
            return Response({
                "success": True,
                "role": user.role,
                "username": user.username,
                "full_name": user.full_name,
                "bio": user.bio
            })

    # Check Student collection (by ID or Email)
    student = Student.objects.filter(student_id=username).first()
    if not student:
        student = Student.objects.filter(email__iexact=username).first()

    if student:
        # Records made from a guard's report have no password until the student registers; the student
        # ID used to work as the password there, but it's printed in the student's QR code
        if not student.password:
            return Response({"error": "This student ID isn't registered yet. Tap Register to create your account."},
                            status=status.HTTP_401_UNAUTHORIZED)
        if check_and_upgrade(student, password):
            return Response({
                "success": True,
                "role": "student",
                "username": student.student_id,
                "student_id": student.student_id,
                "name": student.name
            })

    # Default rejection
    return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

def _registration_details_error(data, require_all):
    """Returns an error message for a taken Student ID / name or a bad contact number, else None."""
    sid = str(data.get('student_id', '')).strip()
    contact = str(data.get('contact_number', '')).strip()
    name = str(data.get('name', '')).strip()

    if require_all and not sid:
        return "Student ID is required."
    if sid and Student.objects.filter(student_id=sid).first():
        return f"Student ID {sid} is already registered."

    if name and Student.objects.filter(name__iexact=name).first():
        return f"A student named '{name}' is already registered."

    if require_all and not contact:
        return "Contact number is required."
    if contact and not (contact.isdigit() and len(contact) == 11):
        return "Contact number must be exactly 11 digits (e.g. 09123456789)."

    return None


def _resolve_service_site(value):
    """The active service site picked in an "Assign Building" dropdown (by site code, or by name for older clients)."""
    value = str(value or '').strip()
    if not value:
        return None
    return (ServiceSite.objects.filter(site_code=value.upper(), is_active=True).first()
            or ServiceSite.objects.filter(name__iexact=value, is_active=True).first())


def _assigned_site_code(eticket):
    """Site code the ticket must be served at. Tickets approved before sites were linked only saved
    the site's name as assigned_location, so fall back to matching that name."""
    code = getattr(eticket, 'assigned_site_code', None)
    if code:
        return code
    site = _resolve_service_site(eticket.assigned_location) if eticket.assigned_location else None
    return site.site_code if site else None


# Tickets still being served; these count against a site's capacity
OPEN_TICKET_STATUSES = ('Active', 'Ongoing')


def site_assigned_counts():
    """{site_code: students with an open ticket there}. Older tickets only saved the site's name."""
    code_by_name = {s.name.lower(): s.site_code for s in ServiceSite.objects.only('name', 'site_code')}
    counts = {}
    for t in ETicket.objects(status__in=OPEN_TICKET_STATUSES).only('assigned_site_code', 'assigned_location'):
        code = t.assigned_site_code or code_by_name.get((t.assigned_location or '').lower())
        if code:
            counts[code] = counts.get(code, 0) + 1
    return counts


def _over_capacity(site, adding, request, exclude_ticket=None):
    """A 409 response when `adding` more students would overfill `site`, unless the admin chose
    "assign anyway" (allow_over_capacity). None when it fits."""
    if not site or adding <= 0:
        return None
    if str(request.data.get('allow_over_capacity')).lower() in ('true', '1'):
        return None
    assigned = site_assigned_counts().get(site.site_code, 0)
    # Moving a ticket that already counts at this site doesn't take a new place
    if exclude_ticket is not None and _assigned_site_code(exclude_ticket) == site.site_code:
        assigned -= 1
    capacity = site.capacity or 10
    if assigned + adding <= capacity:
        return None
    return Response({
        "error": f"{site.name} is full ({assigned}/{capacity} students).",
        "code": "site_full",
        "site": site.name,
        "assigned": assigned,
        "capacity": capacity,
    }, status=status.HTTP_409_CONFLICT)


def _site_ticket_fields(site):
    """E-ticket fields for a ticket assigned to `site`: the site to scan, and its geofence up front for the map."""
    if not site:
        return {}
    return {'assigned_site_code': site.site_code, 'lat': site.latitude, 'lng': site.longitude, 'radius': float(site.radius_m)}


class StudentViewSet(viewsets.ModelViewSet):
    lookup_field = 'student_id'
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def request_otp(self, request):
        import random
        from django.core.mail import send_mail
        from django.conf import settings
        from .models import OTPVerification
        
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        if Student.objects.filter(email__iexact=email).first():
            return Response({"error": "This email is already registered to another student."}, status=status.HTTP_400_BAD_REQUEST)

        # Checked here too so the student finds out before waiting for the email code.
        # Optional because older app builds only send the email.
        details_error = _registration_details_error(request.data, require_all=False)
        if details_error:
            return Response({"error": details_error}, status=status.HTTP_400_BAD_REQUEST)

        otp = str(random.randint(100000, 999999))

        # Invalidate old OTPs for this email
        OTPVerification.objects.filter(email=email).delete()
        
        OTPVerification(email=email, otp=otp).save()
        
        message = f"Your OSAConnect registration verification code is: {otp}\n\nThis code will expire in 5 minutes."
        
        try:
            send_mail(
                subject="OSAConnect: Email Verification Code",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            return Response({"message": "OTP sent successfully"})
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}" if settings.DEBUG else "Failed to send email. Check your connection."
            return Response({"error": error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def register_with_otp(self, request):
        from .models import OTPVerification
        import datetime
        data = request.data
        # Lowercased to match how the code was saved when it was requested
        email = data.get('email', '').strip().lower()
        otp_input = data.get('otp', '').strip()
        
        if not email or not otp_input:
            return Response({"error": "Email and OTP are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Checked before the OTP so a missing password doesn't burn the code
        if not str(data.get('password', '')).strip():
            return Response({"error": "Password is required"}, status=status.HTTP_400_BAD_REQUEST)

        details_error = _registration_details_error(data, require_all=True)
        if details_error:
            return Response({"error": details_error}, status=status.HTTP_400_BAD_REQUEST)

        verification = OTPVerification.objects.filter(email=email).first()
        if not verification:
            return Response({"error": "No OTP requested for this email or it has expired"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check expiration (5 minutes)
        time_elapsed = (utc_now() - verification.created_at).total_seconds()
        if time_elapsed > 300:
            verification.delete()
            return Response({"error": "OTP has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check attempts
        if verification.attempts >= 5:
            verification.delete()
            return Response({"error": "Too many failed attempts. Please request a new OTP."}, status=status.HTTP_400_BAD_REQUEST)
            
        if verification.otp != otp_input:
            verification.attempts += 1
            verification.save()
            return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Valid OTP! Clean up
        verification.delete()
        
        # Proceed with registration
        sid = str(data.get('student_id', '')).strip()
        name = data.get('name', '').strip()

        student = Student(
            student_id=sid,
            name=name,
            course=data.get('course', ''),
            department=data.get('department', ''),
            year_level=data.get('year_level', ''),
            email=email,
            contact_number=str(data.get('contact_number', '')).strip(),
            password=hash_password(data.get('password', ''))
        ).save()
        
        return Response(StudentSerializer(student).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def request_password_reset(self, request):
        import random
        from django.core.mail import send_mail
        from django.conf import settings
        from .models import OTPVerification
        
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        student = Student.objects.filter(email__iexact=email).first()
        if not student:
            return Response({"error": "No account found with this email address."}, status=status.HTTP_404_NOT_FOUND)
            
        otp = str(random.randint(100000, 999999))
        OTPVerification.objects.filter(email=email).delete()
        OTPVerification(email=email, otp=otp).save()
        
        try:
            send_mail(
                subject="OSAConnect: Password Reset Code",
                message=f"Your password reset code is: {otp}\n\nIf you did not request this, please ignore this email.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[student.email],
                fail_silently=False,
            )
            return Response({"message": "Reset code sent to your email."})
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}" if settings.DEBUG else "Failed to send email. Check your connection."
            return Response({"error": error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def reset_password(self, request):
        from .models import OTPVerification
        import datetime
        data = request.data
        # Lowercased to match how the code was saved when it was requested
        email = data.get('email', '').strip().lower()
        otp_input = data.get('otp', '').strip()
        new_password = data.get('password', '').strip()
        
        if not email or not otp_input or not new_password:
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        verification = OTPVerification.objects.filter(email=email).first()
        if not verification:
            return Response({"error": "Invalid or expired reset code."}, status=status.HTTP_400_BAD_REQUEST)
        # Same limit as registration: 5 wrong codes and it has to be requested again
        if verification.attempts >= 5:
            verification.delete()
            return Response({"error": "Too many wrong codes. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
        if verification.otp != otp_input:
            verification.attempts += 1
            verification.save()
            return Response({"error": "Invalid or expired reset code."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check expiration (5 minutes)
        if (utc_now() - verification.created_at).total_seconds() > 300:
            verification.delete()
            return Response({"error": "Reset code has expired."}, status=status.HTTP_400_BAD_REQUEST)
            
        student = Student.objects.filter(email__iexact=email).first()
        if not student:
            return Response({"error": "No account found with this email address."}, status=status.HTTP_404_NOT_FOUND)
        student.password = hash_password(new_password)
        student.save()
        verification.delete()
        
        return Response({"message": "Password reset successful. You can now log in."})

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        data = request.data
        student_id = data.get('student_id')
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not student_id or not current_password or not new_password:
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        student = Student.objects.filter(student_id=student_id).first()
        if not student:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if not verify_password(student.password, current_password)[0]:
            return Response({"error": "Incorrect current password"}, status=status.HTTP_400_BAD_REQUEST)

        student.password = hash_password(new_password)
        student.save()
        return Response({"message": "Password updated successfully"})

    # ── Student Settings: email (verified by a code sent to the new address) and contact number ──

    def _student_with_password(self, data):
        """(student, error Response). Account changes need the current password."""
        student = Student.objects.filter(student_id=str(data.get('student_id') or '').strip()).first()
        if not student:
            return None, Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        if not check_and_upgrade(student, data.get('current_password')):
            return None, Response({"error": "Incorrect current password"}, status=status.HTTP_400_BAD_REQUEST)
        return student, None

    @action(detail=False, methods=['post'])
    def request_email_change(self, request):
        """Emails a 6-digit code to the new address; confirm_email_change saves it."""
        import random
        from .models import OTPVerification

        student, error = self._student_with_password(request.data)
        if error:
            return error
        new_email = str(request.data.get('new_email') or '').strip().lower()
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', new_email):
            return Response({"error": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
        if new_email == (student.email or '').lower():
            return Response({"error": "That is already your email."}, status=status.HTTP_400_BAD_REQUEST)
        if Student.objects.filter(email__iexact=new_email).first():
            return Response({"error": "This email is already registered to another student."}, status=status.HTTP_400_BAD_REQUEST)

        otp = str(random.randint(100000, 999999))
        OTPVerification.objects.filter(email=new_email).delete()
        OTPVerification(email=new_email, otp=otp).save()
        try:
            send_mail(
                subject="OSAConnect: Confirm Your New Email",
                message=f"Hi {student.name},\n\nYour OSAConnect code to change your email to this address is: {otp}\n\n"
                        f"This code will expire in 5 minutes. If you didn't ask for this, you can ignore this email.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[new_email],
                fail_silently=False,
            )
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}" if settings.DEBUG else "Failed to send email. Check your connection."
            return Response({"error": error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({"message": f"We sent a 6-digit code to {new_email}."})

    @action(detail=False, methods=['post'])
    def confirm_email_change(self, request):
        from .models import OTPVerification

        student = Student.objects.filter(student_id=str(request.data.get('student_id') or '').strip()).first()
        if not student:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        new_email = str(request.data.get('new_email') or '').strip().lower()
        otp_input = str(request.data.get('otp') or '').strip()

        # Same rules as registration: 5 minutes, 5 tries
        verification = OTPVerification.objects.filter(email=new_email).first()
        if not verification:
            return Response({"error": "No code was requested for this email or it has expired."}, status=status.HTTP_400_BAD_REQUEST)
        if (utc_now() - verification.created_at).total_seconds() > 300:
            verification.delete()
            return Response({"error": "The code has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
        if verification.attempts >= 5:
            verification.delete()
            return Response({"error": "Too many failed attempts. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)
        if verification.otp != otp_input:
            verification.attempts += 1
            verification.save()
            return Response({"error": "Invalid code"}, status=status.HTTP_400_BAD_REQUEST)
        verification.delete()

        # Someone else may have registered it in the meantime
        if Student.objects.filter(email__iexact=new_email, id__ne=student.id).first():
            return Response({"error": "This email is already registered to another student."}, status=status.HTTP_400_BAD_REQUEST)
        student.email = new_email
        student.save()
        return Response({"message": "Email updated.", "email": new_email})

    @action(detail=False, methods=['post'])
    def update_contact(self, request):
        student, error = self._student_with_password(request.data)
        if error:
            return error
        contact = str(request.data.get('contact_number') or '').strip()
        if not (contact.isdigit() and len(contact) == 11):
            return Response({"error": "Contact number must be exactly 11 digits (e.g. 09123456789)."}, status=status.HTTP_400_BAD_REQUEST)
        student.contact_number = contact
        student.save()
        return Response({"message": "Contact number updated.", "contact_number": contact})

    def create(self, request, *args, **kwargs):
        data = request.data
        sid = data.get('student_id', '').strip()
        name = data.get('name', '').strip()

        if sid and Student.objects.filter(student_id=sid).first():
            return Response({"error": f"Student ID '{sid}' is already in use."}, status=status.HTTP_400_BAD_REQUEST)
        
        if name and Student.objects.filter(name__iexact=name).first():
            return Response({"error": f"A student named '{name}' is already registered."}, status=status.HTTP_400_BAD_REQUEST)
            
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        try:
            student = self.get_object()
            data = request.data
            
            # 1. Validate Name Uniqueness if changing
            new_name = data.get('name', '').strip()
            if new_name and new_name.lower() != student.name.lower():
                if Student.objects.filter(name__iexact=new_name).first():
                    return Response({"error": f"A student named '{new_name}' is already registered."}, status=status.HTTP_400_BAD_REQUEST)
                student.name = new_name

            # 2. Validate Student ID Uniqueness if changing
            new_student_id = data.get('student_id', '').strip()
            if new_student_id and new_student_id != student.student_id:
                if Student.objects.filter(student_id=new_student_id).first():
                    return Response({"error": f"Student ID '{new_student_id}' is already in use."}, status=status.HTTP_400_BAD_REQUEST)
                student.student_id = new_student_id

            student.course = data.get('course', student.course)
            student.department = data.get('department', student.department)
            student.year_level = data.get('year_level', student.year_level)
            student.email = data.get('email', student.email)
            student.contact_number = data.get('contact_number', student.contact_number)
            
            student.save()
            serializer = self.get_serializer(student)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

PUNISHMENT_SYSTEM = {
    "No ID": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "Improper wearing of ID": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "Dress code violation": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "Littering": {
        1: {"punishment": "2 hours campus cleaning", "hours": 2},
        2: {"punishment": "4 hours community service", "hours": 4},
    },
    "Disrespect to staff": {
        1: {"punishment": "8 hours community service", "hours": 8},
        2: {"punishment": "1 to 2 days community service", "hours": 16},
    },
    "Public disturbance": {
        1: {"punishment": "6 hours community service", "hours": 6},
    },
    "Unauthorized use of facilities": {
        1: {"punishment": "1 day community service + payment for damages if needed", "hours": 8},
    },
    "Cheating": {
        1: {"punishment": "2 to 3 days community service + academic sanction from instructor", "hours": 20},
    },
    "Forgery of signature": {
        1: {"punishment": "2 to 5 days community service + possible disciplinary hearing", "hours": 32},
    },
    "Vandalism": {
        1: {"punishment": "3 to 5 days community service + payment for damages", "hours": 32},
    },
    "Smoking inside campus": {
        1: {"punishment": "1 day community service + seminar on campus rules", "hours": 8},
    },
    "Serious misconduct": {
        1: {"punishment": "Disciplinary hearing + possible suspension", "hours": 0},
    },
}

# Applied to violation types that aren't in PUNISHMENT_SYSTEM
DEFAULT_PUNISHMENT = {"punishment": "To be determined", "hours": 4}

def get_offense_count(student, violation_type):
    """Count how many times this student has committed this violation type"""
    count = ViolationReport.objects.filter(
        student=student,
        violation_type=violation_type
    ).count()
    return count + 1  # +1 because this is the current offense

def get_punishment(violation_type, offense_count):
    """Get the punishment based on violation type and offense count"""
    if violation_type in PUNISHMENT_SYSTEM:
        violation_punishments = PUNISHMENT_SYSTEM[violation_type]
        if offense_count in violation_punishments:
            return violation_punishments[offense_count]
        # If offense count exceeds defined punishments, use the last one
        return list(violation_punishments.values())[-1]
    # Default punishment for undefined violations
    return DEFAULT_PUNISHMENT

def send_violation_email(report):
    """Sends an email notification to the student about their violation report"""
    student = report.student
    if not student.email:
        print(f"EMAIL NOT SENT: No email registered for student {student.student_id}")
        return False
        
    subject = f"OSAConnect: Notice of Campus Incident Report"
    
    # Saved as UTC; the email shows Philippine time (UTC+8, no daylight saving)
    ph_time = report.created_at.replace(tzinfo=datetime.timezone.utc).astimezone(datetime.timezone(datetime.timedelta(hours=8))) if report.created_at else None
    date_str = ph_time.strftime("%B %d, %Y at %I:%M %p") if ph_time else "Unknown"
    location = report.location if hasattr(report, 'location') and report.location else "Campus Premises"
    
    message = f"""Dear {student.name},

You are receiving this official notification because an incident report has been filed under your name by a campus security guard or staff member.

Incident Details:
- Violation Type: {report.violation_type}
- Date & Time: {date_str}
- Location: {location}
- Description: {report.description or 'No additional description provided.'}
- Reported By: {report.reporting_guard}

Your report has been forwarded to the Office of Student Affairs (OSA) for review. 
Please log in to the OSAConnect portal to view your status, respond to the report, and check if any community service obligations or disciplinary actions are required.

This is an automated message. Please do not reply to this email.

Regards,
Office of Student Affairs
"""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            fail_silently=False,
        )
        print(f"EMAIL SUCCESS: Notification sent to {student.email}")
        return True
    except Exception as e:
        print(f"EMAIL ERROR: Failed to send to {student.email}. Error: {str(e)}")
        return False

def _student_filter(request):
    """The Student named by ?student_id= (student dashboards ask only for their own records), False when
    the parameter isn't given (admin pages list everything), or None for an unknown student."""
    student_id = request.query_params.get('student_id') if request.method == 'GET' else None
    if not student_id:
        return False
    return Student.objects.filter(student_id=student_id.strip()).first()


class ViolationViewSet(viewsets.ModelViewSet):
    queryset = ViolationReport.objects.all()
    serializer_class = ViolationReportSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        # select_related loads the students in one query instead of one per violation
        student = _student_filter(self.request)
        if student is False:
            qs = ViolationReport.objects.all()
        else:
            qs = ViolationReport.objects(student=student) if student else ViolationReport.objects.none()
        # select_related returns a plain list, which single-record routes (/violations/<id>/) can't use
        return qs.select_related() if self.action == 'list' and student is not None else qs


    @action(detail=False, methods=['get'])
    def analytics(self, request):
        from collections import Counter
        all_violations = ViolationReport.objects.all()
        counts = Counter(v.violation_type for v in all_violations)
        sorted_data = sorted(
            [{"violation_type": k, "count": v} for k, v in counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )
        return Response(sorted_data)

    @action(detail=False, methods=['get'])
    def punishments(self, request):
        """Read-only penalties table for the Help pages (source of truth: PUNISHMENT_SYSTEM)"""
        rules = [
            {
                "violation_type": violation_type,
                "offenses": [
                    {"offense": offense, "punishment": info["punishment"], "hours": info["hours"]}
                    for offense, info in sorted(offenses.items())
                ],
            }
            for violation_type, offenses in PUNISHMENT_SYSTEM.items()
        ]
        return Response({
            "rules": rules,
            "default": DEFAULT_PUNISHMENT,
            # get_punishment() reuses the last defined penalty once a student passes it
            "repeat_last_offense": True,
        })

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        data = request.data
        # The building dropdown lists service sites (their site code); older clients send a name
        assigned_site = _resolve_service_site(data.get('assigned_building'))
        student_ids = data.get('student_ids', [])
        # Rules: Predefined violation type for bulk reports
        violation_type = "Failure to attend mandatory campus event"
        assigned_building = assigned_site.name if assigned_site else data.get('assigned_building')
        reporter = data.get('reporter', 'OSA Administrator')
        
        if not student_ids:
            return Response({"error": "No students selected"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not assigned_building:
            return Response({"error": "Please assign a building for the bulk report"}, status=status.HTTP_400_BAD_REQUEST)
        full = _over_capacity(assigned_site, len(student_ids), request)
        if full:
            return full

        results = []
        for sid in student_ids:
            try:
                student = Student.objects.get(student_id=sid)
                offense_count = get_offense_count(student, violation_type)
                punishment_info = get_punishment(violation_type, offense_count)
                punishment = punishment_info["punishment"]
                hours = punishment_info["hours"]

                report = ViolationReport(
                    student=student,
                    violation_type=violation_type,
                    description=f"Bulk report: {violation_type}",
                    reporting_guard=reporter,
                    status="Approved", 
                    assigned_building=assigned_building,
                    offense_count=offense_count,
                    punishment=punishment,
                    created_at=utc_now()
                ).save()
                
                # Send Email Notification
                try:
                    send_violation_email(report)
                except:
                    pass
                
                # Create ETicket automatically for bulk reports if hours > 0
                if hours > 0:
                    ETicket(
                        violation=report,
                        assigned_location=assigned_building,
                        total_hours_required=hours,
                        remaining_hours=hours,
                        status="Active",
                        **_site_ticket_fields(assigned_site)
                    ).save()
                    
                results.append({"student_id": sid, "status": "success"})
            except Student.DoesNotExist:
                results.append({"student_id": sid, "status": "failed", "error": "Student not found"})
            except Exception as e:
                results.append({"student_id": sid, "status": "failed", "error": str(e)})
                
        return Response({
            "message": f"Bulk report processed. {len([r for r in results if r['status'] == 'success'])} students reported.",
            "results": results
        }, status=status.HTTP_201_CREATED)

    def create(self, request, *args, **kwargs):
        data = request.data
        print(f"--- DATABASE SYNC: PREPARING VIOLATION REPORT ---")
        print(f"Payload: {data}")
        
        student_id = data.get('student_id')
        if not student_id:
            # Fallback for old field name just in case
            student_id = data.get('studentId')
            
        if not student_id:
            return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. ORM: Find or Create Student to ensure link exists
        try:
            student = Student.objects.get(student_id=student_id)
            print(f"DB MATCH: Existing student record found: {student.name}")
        except Student.DoesNotExist:
            # CHECK FOR DUPLICATE NAME (Prevent duplicate accounts for same person with different ID)
            provided_name = data.get('name', 'New Student').strip()
            # Normalize ID as well just in case
            student_id = student_id.strip()
            
            existing_student_by_name = Student.objects.filter(name__iexact=provided_name).first()
            
            if existing_student_by_name:
                print(f"DB LINK: Student {provided_name} exists under different ID. Linking report to existing account.")
                student = existing_student_by_name
            else:
                print(f"DB SYNC: Creating missing student profile for {student_id}...")
                student = Student(
                    student_id=student_id,
                    name=provided_name,
                    course=data.get('course', 'Unknown'),
                    department=data.get('department', 'Unknown'),
                    contact_number=data.get('contact', ''),
                    email=data.get('email', '')
                ).save()
                print(f"DB SUCCESS: New student registered: {student.name}")
            
        # 2. Calculate offense count and punishment
        violation_type = data.get('violation_type', data.get('violation', 'Other'))
        offense_count = get_offense_count(student, violation_type)
        punishment_info = get_punishment(violation_type, offense_count)
        
        # All violations now require Pending OSA Review (warnings replaced with community service hours)
        violation_status = "Pending OSA Review"
        notification_type = "action_required"
        
        # 3. ODM: Directly instantiate and save the ViolationReport to 'violation_reports' collection
        try:
            # We save directly using Mongoengine to bypass any potential Serializer mapping issues
            report = ViolationReport(
                student=student,
                violation_type=violation_type,
                description=data.get('description', ''),
                reporting_guard=data.get('reporting_guard', 'Gate Guard'),
                status=violation_status,
                offense_count=offense_count,
                punishment=punishment_info["punishment"],
                created_at=utc_now()
            )
            report.save()
            
            # Send Email Notification
            send_violation_email(report)
            
            print(f"DB SYNC SUCCESS: Violation {report.id} committed to collection 'violation_reports'")
            print(f"Offense #{offense_count} for {violation_type}: {punishment_info['punishment']}")
            
            # 4. Return serialized data so the frontend can update UI
            response_data = self.get_serializer(report).data
            response_data["offense_count"] = offense_count
            response_data["punishment"] = punishment_info["punishment"]
            response_data["notification_type"] = notification_type
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"DB SYNC FAILED: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def approve(self, request, *args, **kwargs):
        try:
            violation_id = kwargs.get('id') or kwargs.get('pk')
            violation = ViolationReport.objects.get(id=violation_id)
            
            # REQUIRE BUILDING ASSIGNMENT
            assigned_building = request.data.get('assigned_building')
            if not assigned_building:
                return Response({"error": "Please assign a building before approval"}, status=status.HTTP_400_BAD_REQUEST)
            # The building dropdown lists service sites (their site code); older clients send a name
            assigned_site = _resolve_service_site(assigned_building)
            if assigned_site:
                assigned_building = assigned_site.name
            
            if violation.status == "Approved" or violation.status == "Completed":
                return Response({"error": "Violation is already approved or completed."}, status=status.HTTP_400_BAD_REQUEST)

            # Get custom hours if provided
            custom_hours = request.data.get('custom_hours')
            if custom_hours is not None and str(custom_hours).strip() != '':
                hours = float(custom_hours)
                punishment = f"{hours} hours community service"
            else:
                punishment_info = get_punishment(violation.violation_type, violation.offense_count)
                hours = punishment_info["hours"]
                punishment = punishment_info["punishment"]

            # Only students who get a ticket take a place at the site
            full = _over_capacity(assigned_site, 1 if hours > 0 else 0, request)
            if full:
                return full

            violation.status = "Approved"
            violation.assigned_building = assigned_building
            violation.punishment = punishment
            
            violation.save()
            
            # Only create E-Ticket if there are hours to serve
            if hours > 0:
                ticket = ETicket(
                    violation=violation,
                    assigned_location=assigned_building,
                    total_hours_required=hours,
                    remaining_hours=hours,
                    status="Active",
                    **_site_ticket_fields(assigned_site)
                ).save()
                print(f"Violation {violation_id} APPROVED. Assigned to {assigned_building}. E-Ticket {ticket.id} created.")
                return Response({"message": f"Violation approved and assigned to {assigned_building}."}, status=status.HTTP_200_OK)
            
            violation.status = "Completed"
            violation.save()
            return Response({"message": f"Violation approved and assigned to {assigned_building}. No service hours required."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reassign(self, request, *args, **kwargs):
        """Move an approved violation to another service site (sites change day to day).
        The ticket is re-linked to the new site, so only that site's QR starts the timer."""
        try:
            violation = ViolationReport.objects.get(id=kwargs.get('id') or kwargs.get('pk'))
        except Exception:
            return Response({"error": "Violation not found."}, status=status.HTTP_404_NOT_FOUND)

        site = _resolve_service_site(request.data.get('assigned_building'))
        if not site:
            return Response({"error": "Choose an active service site."}, status=status.HTTP_400_BAD_REQUEST)
        if (violation.status or '').lower().startswith('pending'):
            return Response({"error": "Approve the violation first; the building is set on approval."}, status=status.HTTP_400_BAD_REQUEST)

        ticket = ETicket.objects(violation=violation).order_by('-created_at').first()
        if ticket and ticket.status == 'Ongoing':
            return Response({"error": "The student is serving right now. Change the building after they stop."}, status=status.HTTP_400_BAD_REQUEST)

        open_ticket = ticket if ticket and ticket.status in OPEN_TICKET_STATUSES else None
        full = _over_capacity(site, 1 if open_ticket else 0, request, exclude_ticket=open_ticket)
        if full:
            return full

        violation.assigned_building = site.name
        violation.save()
        if ticket:
            ticket.assigned_location = site.name
            for field, value in _site_ticket_fields(site).items():
                setattr(ticket, field, value)
            ticket.save()
        return Response({"message": f"Assigned to {site.name}.", "assigned_building": site.name}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def dismiss(self, request, *args, **kwargs):
        try:
            violation_id = kwargs.get('id') or kwargs.get('pk')
            violation = ViolationReport.objects.get(id=violation_id)
            violation.status = "Dismissed"
            violation.save()
            print(f"Violation {violation_id} DISMISSED.")
            return Response({"message": "Violation Dismissed."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ETicketViewSet(viewsets.ModelViewSet):
    queryset = ETicket.objects.all()
    serializer_class = ETicketSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        # select_related(2) loads each ticket's violation and its student in bulk, not one query each
        student = _student_filter(self.request)
        if student is False:
            qs = ETicket.objects.all()
        elif not student:
            return ETicket.objects.none()
        else:
            qs = ETicket.objects(violation__in=ViolationReport.objects(student=student).only('id'))
        # select_related returns a plain list, which single-record routes (/etickets/<id>/) can't use
        return qs.select_related(max_depth=2) if self.action == 'list' else qs

    def list(self, request, *args, **kwargs):
        stop_silent_sessions()
        # Every ticket shows its student: load them all in one query rather than one per ticket
        tickets = list(self.get_queryset())
        violations = [t.violation for t in tickets if isinstance(t.violation, ViolationReport)]
        student_ids = {v._data.get('student').id if hasattr(v._data.get('student'), 'id') else v._data.get('student')
                       for v in violations if v._data.get('student') is not None}
        students = {s.id: s for s in Student.objects(id__in=list(student_ids))}
        for v in violations:
            ref = v._data.get('student')
            ref_id = getattr(ref, 'id', ref)
            if ref_id in students:
                v._data['student'] = students[ref_id]
        return Response(self.get_serializer(tickets, many=True).data)

    @action(detail=False, methods=['post'])
    def manual_time_in(self, request):
        """Admin can manually force time in for a student using a code"""
        student_id = request.data.get('student_id')
        code = request.data.get('code', '').upper()

        valid_codes = ['OSA-START', 'OSA-RESUME', 'OSA-IN']

        if code not in valid_codes:
            return Response({"error": "Invalid code. Use OSA-START to begin service."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Find the student
            student = Student.objects.get(student_id=student_id)

            # Find the student's active ticket
            ticket = None
            for t in ETicket.objects.all():
                try:
                    if t.violation.student.student_id == student_id and t.status in ['Active', 'Ongoing']:
                        ticket = t
                        break
                except:
                    pass

            if not ticket:
                return Response({"error": "No active E-Ticket found for this student"}, status=status.HTTP_404_NOT_FOUND)

            # Check if timer already running
            open_log = TimeLog.objects.filter(eticket=ticket, time_out=None).first()
            if open_log:
                return Response({"error": "Timer already running for this student"}, status=status.HTTP_400_BAD_REQUEST)

            # Close any existing open time logs first
            open_logs = TimeLog.objects.filter(eticket=ticket, time_out=None)
            for log in open_logs:
                log.time_out = utc_now()
                duration = (log.time_out - log.time_in).total_seconds()
                log.duration_seconds = duration
                log.save()
                ticket.remaining_hours = max(0, ticket.remaining_hours - (duration / 3600))
                
                if ticket.remaining_hours <= 0.001:
                    ticket.remaining_hours = 0
                    ticket.status = "Finished"
                    ticket.violation.status = "Finished"
                    ticket.violation.save()

            if ticket.remaining_hours > 0:
                # Start timer - use remaining hours from ticket
                ticket.status = "Ongoing"
                ticket.save()
                # Create a new time log
                log = TimeLog(eticket=ticket).save()
            else:
                ticket.save()

            return Response({
                "message": f"Timer started for student {student_id}",
                "remaining_hours": ticket.remaining_hours,
                "status": ticket.status
            })

        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def manual_time_out(self, request):
        """Admin can manually force time out for a student"""
        student_id = request.data.get('student_id')

        try:
            # Find the student
            student = Student.objects.get(student_id=student_id)

            # Find the student's ongoing ticket
            ticket = None
            for t in ETicket.objects.all():
                try:
                    if t.violation.student.student_id == student_id and t.status == 'Ongoing':
                        ticket = t
                        break
                except:
                    pass

            if not ticket:
                return Response({"error": "No active timer found for this student"}, status=status.HTTP_404_NOT_FOUND)

            # Find and close the open time log
            open_log = TimeLog.objects.filter(eticket=ticket, time_out=None).first()
            if open_log:
                open_log.time_out = utc_now()
                duration = (open_log.time_out - open_log.time_in).total_seconds()
                open_log.duration_seconds = duration
                open_log.save()

                # Deduct hours
                hours_to_deduct = duration / 3600
                ticket.remaining_hours = max(0, ticket.remaining_hours - hours_to_deduct)
                
                if ticket.remaining_hours <= 0.001:
                    ticket.remaining_hours = 0
                    ticket.status = "Finished"
                    ticket.violation.status = "Finished"
                    ticket.violation.save()
                else:
                    ticket.status = "Active"
                ticket.save()

            return Response({
                "message": f"Timer stopped for student {student_id}",
                "remaining_hours": ticket.remaining_hours,
                "status": ticket.status
            })

        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# Starting a session: the student must be inside the site's circle. GPS accuracy adds up to
# MAX_ACCURACY_BUFFER_M, the same 0.7 x accuracy allowance the dashboards use for auto-stop.
ACCURACY_BUFFER_FACTOR = 0.7
MAX_ACCURACY_BUFFER_M = 20


def _distance_m(lat1, lng1, lat2, lng2):
    """Great-circle distance in meters."""
    import math
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _outside_site_error(request, lat, lng, radius, place):
    """Error message when the student's position (sent with the scan) isn't inside the site, else None."""
    student_lat = _float_or_none(request.data.get('student_lat'))
    student_lng = _float_or_none(request.data.get('student_lng'))
    if student_lat is None or student_lng is None:
        return "We couldn't get your location. Turn on location and try again."
    accuracy = _float_or_none(request.data.get('accuracy_m')) or 0
    allowed = float(radius) + min(max(accuracy, 0) * ACCURACY_BUFFER_FACTOR, MAX_ACCURACY_BUFFER_M)
    distance = _distance_m(student_lat, student_lng, lat, lng)
    if distance <= allowed:
        return None
    return (f"You're {round(distance)} m away from {place}. Go inside the service area "
            f"(within {round(float(radius))} m) and scan again to start your timer.")


# How a session ended, shown on the time-out receipt
TIMELOG_END_REASONS = {
    'scanned_out': 'Scanned the time-out QR',
    'left_area': 'Left the service area',
    'location_off': 'Location turned off or lost',
    'app_closed': 'Left the app',
    'logout': 'Logged out',
    'idle': 'Logged out for inactivity',
    'completed': 'Finished the required hours',
}
TIMELOG_EVENT_TYPES = ('left_area', 'returned', 'location_off', 'location_on')
MAX_EVENTS_PER_SESSION = 200


def _aware_iso(dt):
    """Saved times are naive UTC (models.utc_now); marking them as UTC lets every browser and phone
    show the right local time."""
    return dt.replace(tzinfo=datetime.timezone.utc).isoformat() if dt else None


def _float_or_none(value):
    try:
        return round(float(value), 7) if value not in (None, '') else None
    except (TypeError, ValueError):
        return None


def _session_site(eticket):
    """(site_code, site_name) of where this ticket's session is served."""
    code = eticket.site_code or _assigned_site_code(eticket)
    site = ServiceSite.objects.filter(site_code=code).first() if code else None
    return code, (site.name if site else eticket.assigned_location)


def timelog_receipt(log, eticket=None):
    """Time-out receipt: date, building, time in/out, duration, how it ended, and the session's events."""
    eticket = eticket or log.eticket
    code, name = log.site_code, log.site_name
    if not name and eticket:
        code, name = _session_site(eticket)
    events = []
    for e in (log.events or []):
        events.append({**e, 'at': _aware_iso(e.get('at')) if isinstance(e.get('at'), datetime.datetime) else e.get('at')})
    reason = log.end_reason or ('scanned_out' if log.time_out else None)
    violation = eticket.violation if eticket else None
    student = violation.student if violation else None
    return {
        'id': str(log.id),
        'eticket_id': str(eticket.id) if eticket else None,
        'student_id': student.student_id if student else None,
        'student_name': student.name if student else None,
        'violation_type': violation.violation_type if violation else None,
        'site_code': code,
        'building': name,
        'time_in': _aware_iso(log.time_in),
        'time_out': _aware_iso(log.time_out),
        'duration_seconds': round(log.duration_seconds or 0),
        'end_reason': reason,
        'end_reason_label': TIMELOG_END_REASONS.get(reason, 'Still running' if not log.time_out else reason),
        'out_lat': log.out_lat,
        'out_lng': log.out_lng,
        'out_distance_m': round(log.out_distance_m) if log.out_distance_m is not None else None,
        'events': events,
        'left_area_count': sum(1 for e in events if e.get('type') == 'left_area'),
        'remaining_hours': eticket.remaining_hours if eticket else None,
        'ticket_status': eticket.status if eticket else None,
    }


# Tracked sessions: outside the site this long ends the session (same as the dashboards' countdown);
# no confirmed location for this long (location off, phone off, app killed) ends it too.
OUT_OF_AREA_LIMIT_S = 30
NO_LOCATION_LIMIT_S = 30


def end_session(log, eticket, reason, time_out=None, lat=None, lng=None, distance=None):
    """Closes a running session, deducts the time served, and returns its receipt."""
    log.time_out = max(time_out or utc_now(), log.time_in)
    duration = (log.time_out - log.time_in).total_seconds()
    log.duration_seconds = duration
    log.end_reason = reason if reason in TIMELOG_END_REASONS else 'scanned_out'
    log.out_lat, log.out_lng, log.out_distance_m = lat, lng, distance
    log.outside_since = None
    if not log.site_name:
        log.site_code, log.site_name = _session_site(eticket)
    log.save()

    eticket.remaining_hours = max(0, eticket.remaining_hours - duration / 3600)
    if eticket.remaining_hours <= 0.01:
        eticket.remaining_hours = 0
        eticket.status = "Completed"
        eticket.violation.status = "Completed"
        eticket.violation.save()
    else:
        eticket.status = "Active"
    eticket.save()
    if eticket.status == "Completed" and log.end_reason == 'scanned_out':
        log.end_reason = 'completed'
        log.save()
    return timelog_receipt(log, eticket)


def stop_silent_sessions():
    """Ends tracked sessions that haven't confirmed a location for NO_LOCATION_LIMIT_S. Only the time up to
    the last confirmed location counts. Runs whenever tickets are listed (dashboards poll every 5 s)."""
    cutoff = utc_now() - datetime.timedelta(seconds=NO_LOCATION_LIMIT_S)
    for log in TimeLog.objects(time_out=None, tracked=True, last_ping_at__lt=cutoff):
        try:
            end_session(log, log.eticket, 'location_off', time_out=log.last_ping_at, lat=log.last_lat, lng=log.last_lng)
        except Exception as e:
            print(f"stop_silent_sessions: {e}")


class TimeLogViewSet(viewsets.ModelViewSet):
    # Selfie proofs were dropped; old ones made this list many MB, so the photo fields are never loaded
    queryset = TimeLog.objects.exclude('photo_proof_in', 'photo_proof_out')
    serializer_class = TimeLogSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def log_time(self, request):
        eticket_id = request.data.get('eticket_id')
        action_type = request.data.get('action') # 'in' or 'out'
        
        try:
            eticket = ETicket.objects.get(id=eticket_id)
            
            if action_type == 'custom':
                hours = float(request.data.get('deduct_hours', 0))
                eticket.remaining_hours = max(0, eticket.remaining_hours - hours)
                if eticket.remaining_hours <= 0.01:
                    eticket.remaining_hours = 0
                    eticket.status = "Completed"
                    eticket.violation.status = "Completed"
                    eticket.violation.save()
                eticket.save()
                return Response({"message": f"Successfully deducted {hours} hours!"})

            elif action_type == 'set_start':
                hours = float(request.data.get('deduct_hours', 0))
                
                # Close any existing open time logs for this ticket
                open_logs = TimeLog.objects.filter(eticket=eticket, time_out=None)
                for old_log in open_logs:
                    old_log.time_out = utc_now()
                    old_log.duration_seconds = 0  # Don't count old partial sessions
                    old_log.save()
                
                # Set remaining hours to EXACTLY the QR code value
                eticket.remaining_hours = hours
                eticket.status = "Ongoing"
                eticket.save()
                
                # Create a fresh time log for this new session
                log = TimeLog(eticket=eticket).save()
                    
                print(f"SET_START: Timer reset to {hours} hours for ticket {eticket.id}")
                return Response({"message": f"Timer started for {hours} hours!", "hours": hours})

            elif action_type == 'in':
                # Update location if provided (Smart QR)
                lat = request.data.get('lat')
                lng = request.data.get('lng')
                radius = request.data.get('radius')
                site_code = str(request.data.get('site_code') or '').strip().upper()

                # Assigned to a site: only that site's QR starts the timer (not other sites or the old OSA codes)
                assigned_code = _assigned_site_code(eticket)
                if assigned_code and site_code != assigned_code:
                    assigned = ServiceSite.objects.filter(site_code=assigned_code).first()
                    label = f"{assigned.name} ({assigned_code})" if assigned else assigned_code
                    return Response({"error": f"You're assigned to {label}. Scan the QR code posted there to start your timer."}, status=status.HTTP_400_BAD_REQUEST)

                running = TimeLog.objects.filter(eticket=eticket, time_out=None).first()

                if site_code:
                    # Registered service site: the geofence comes from the saved site, never from the phone
                    site = ServiceSite.objects.filter(site_code=site_code, is_active=True).first()
                    if not site:
                        return Response({"error": f"{site_code} is not an active service site."}, status=status.HTTP_400_BAD_REQUEST)
                    # The timer only starts when the student is at the site
                    outside = None if running else _outside_site_error(request, site.latitude, site.longitude, site.radius_m, site.name)
                    if outside:
                        return Response({"error": outside, "code": "outside_site"}, status=status.HTTP_400_BAD_REQUEST)
                    if not running:
                        eticket.lat = site.latitude
                        eticket.lng = site.longitude
                        eticket.radius = float(site.radius_m)
                        eticket.site_code = site.site_code
                        eticket.save()
                elif lat is not None and lng is not None:
                    outside = None if running else _outside_site_error(request, float(lat), float(lng), float(radius or 5), "the service point")
                    if outside:
                        return Response({"error": outside, "code": "outside_site"}, status=status.HTTP_400_BAD_REQUEST)
                    eticket.lat = float(lat)
                    eticket.lng = float(lng)
                    eticket.radius = float(radius or 5)
                    eticket.site_code = None
                    eticket.save()

                # Check if there's already an active session
                existing_log = TimeLog.objects.filter(eticket=eticket, time_out=None).first()
                if existing_log:
                    # Timer already running, just return the existing log
                    return Response(TimeLogSerializer(existing_log).data)
                
                # Create new session only if none exists; the site is kept for the receipt
                log_site_code, log_site_name = _session_site(eticket)
                # Clients that send location pings (also from the background) ask for tracking
                tracked = str(request.data.get('track_location')).lower() in ('true', '1')
                log = TimeLog(
                    eticket=eticket, site_code=log_site_code, site_name=log_site_name, tracked=tracked,
                    last_ping_at=utc_now() if tracked else None,
                    last_lat=_float_or_none(request.data.get('student_lat')),
                    last_lng=_float_or_none(request.data.get('student_lng')),
                ).save()
                eticket.status = "Ongoing"
                eticket.save()
                return Response(TimeLogSerializer(log).data)
            else:
                site_code = str(request.data.get('site_code') or '').strip().upper()
                # Ending with a site QR: it must be the site the session started at
                if site_code and eticket.site_code and site_code != eticket.site_code:
                    return Response({"error": f"Scan the QR code of {eticket.site_code}, where you started this session."}, status=status.HTTP_400_BAD_REQUEST)
                if site_code and not ServiceSite.objects.filter(site_code=site_code).first():
                    return Response({"error": f"{site_code} is not a service site."}, status=status.HTTP_400_BAD_REQUEST)
                log = TimeLog.objects.filter(eticket=eticket, time_out=None).order_by('-time_in').first()
                if log:
                    reason = request.data.get('end_reason')
                    # Location off: only the time up to the last confirmed location counts
                    time_out = log.last_ping_at if reason == 'location_off' and log.last_ping_at else None
                    receipt = end_session(
                        log, eticket, reason, time_out=time_out,
                        lat=_float_or_none(request.data.get('lat')) if not site_code else None,
                        lng=_float_or_none(request.data.get('lng')) if not site_code else None,
                        distance=_float_or_none(request.data.get('distance_m')),
                    )
                    return Response({**TimeLogSerializer(log).data, 'receipt': receipt})
                # Already stopped (left the area, location off, other device): show how it ended
                last = TimeLog.objects(eticket=eticket).exclude('photo_proof_in', 'photo_proof_out').order_by('-time_in').first()
                if last:
                    return Response({'already_ended': True, 'receipt': {**timelog_receipt(last, eticket), 'already_ended': True}})
                return Response({"error": "No active session"}, status=status.HTTP_400_BAD_REQUEST)
        except (ETicket.DoesNotExist, MongoValidationError, InvalidId):
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def location_ping(self, request):
        """The student's position during a tracked session, sent every ~15 s by the Android background
        task and the open website. The server decides: outside the site for OUT_OF_AREA_LIMIT_S ends the
        session ("Left the service area"); location_off ends it at the last confirmed position.
        Returns {state: 'running' | 'stopped' | 'none', ...}; 'stopped' includes the receipt."""
        try:
            eticket = ETicket.objects.get(id=request.data.get('eticket_id'))
        except Exception:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)
        log = TimeLog.objects.filter(eticket=eticket, time_out=None).order_by('-time_in').first()
        if not log:
            # Already ended (e.g. from the other device); the latest receipt says how
            last = TimeLog.objects(eticket=eticket).exclude('photo_proof_in', 'photo_proof_out').order_by('-time_in').first()
            return Response({"state": "none", "receipt": timelog_receipt(last, eticket) if last else None})

        now = utc_now()
        if str(request.data.get('location_off')).lower() in ('true', '1'):
            TimeLog.objects(id=log.id).update_one(push__events={'type': 'location_off', 'at': now})
            log.reload()
            receipt = end_session(log, eticket, 'location_off', time_out=log.last_ping_at,
                                  lat=log.last_lat, lng=log.last_lng)
            return Response({"state": "stopped", "reason": "location_off", "receipt": receipt})

        lat = _float_or_none(request.data.get('lat'))
        lng = _float_or_none(request.data.get('lng'))
        if lat is None or lng is None or eticket.lat is None or eticket.lng is None:
            return Response({"state": "running"})
        accuracy = _float_or_none(request.data.get('accuracy_m')) or 0
        allowed = float(eticket.radius or 50) + min(max(accuracy, 0) * ACCURACY_BUFFER_FACTOR, MAX_ACCURACY_BUFFER_M)
        distance = round(_distance_m(lat, lng, eticket.lat, eticket.lng))

        log.last_ping_at, log.last_lat, log.last_lng = now, lat, lng
        if distance <= allowed:
            if log.outside_since:
                log.events = (log.events or []) + [{'type': 'returned', 'at': now, 'lat': lat, 'lng': lng, 'distance_m': distance}]
                log.outside_since = None
            log.save()
            return Response({"state": "running", "inside": True, "distance_m": distance})

        if not log.outside_since:
            log.outside_since = now
            log.events = (log.events or []) + [{'type': 'left_area', 'at': now, 'lat': lat, 'lng': lng, 'distance_m': distance}]
            log.save()
        outside_s = (now - log.outside_since).total_seconds()
        if outside_s >= OUT_OF_AREA_LIMIT_S:
            receipt = end_session(log, eticket, 'left_area', lat=lat, lng=lng, distance=distance)
            return Response({"state": "stopped", "reason": "left_area", "receipt": receipt})
        log.save()
        return Response({"state": "running", "inside": False, "distance_m": distance,
                         "seconds_left": max(0, round(OUT_OF_AREA_LIMIT_S - outside_s))})

    @action(detail=False, methods=['post'])
    def log_event(self, request):
        """Records something that happened during a running session (left the area, came back,
        location off/on) so the time-out receipt can show it."""
        event_type = request.data.get('type')
        if event_type not in TIMELOG_EVENT_TYPES:
            return Response({"error": "Unknown event type."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            eticket = ETicket.objects.get(id=request.data.get('eticket_id'))
        except Exception:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)
        log = TimeLog.objects.filter(eticket=eticket, time_out=None).order_by('-time_in').first()
        if not log:
            return Response({"error": "No active session"}, status=status.HTTP_400_BAD_REQUEST)
        if len(log.events or []) >= MAX_EVENTS_PER_SESSION:
            return Response({"ok": True, "dropped": True})
        event = {'type': event_type, 'at': utc_now()}
        for key in ('lat', 'lng', 'distance_m'):
            value = _float_or_none(request.data.get(key))
            if value is not None:
                event[key] = round(value) if key == 'distance_m' else value
        TimeLog.objects(id=log.id).update_one(push__events=event)
        return Response({"ok": True})

    @action(detail=False, methods=['get'])
    def receipts(self, request):
        """Time-out receipts, newest first, for one student (?student_id=) or one ticket (?eticket_id=)."""
        student_id = request.query_params.get('student_id')
        eticket_id = request.query_params.get('eticket_id')
        if eticket_id:
            tickets = list(ETicket.objects(id=eticket_id))
        elif student_id:
            student = Student.objects.filter(student_id=student_id).first()
            if not student:
                return Response([])
            violations = ViolationReport.objects(student=student)
            tickets = list(ETicket.objects(violation__in=violations))
        else:
            return Response({"error": "student_id or eticket_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        by_id = {t.id: t for t in tickets}
        logs = TimeLog.objects(eticket__in=tickets).exclude('photo_proof_in', 'photo_proof_out').order_by('-time_in').limit(50)
        return Response([timelog_receipt(log, by_id.get(log.to_mongo().get("eticket"))) for log in logs])


from .serializers import SystemUserSerializer

class SystemUserViewSet(viewsets.ModelViewSet):
    queryset = SystemUser.objects.all()
    serializer_class = SystemUserSerializer
    permission_classes = [AllowAny]
    lookup_field = 'username'

    # Anyone could POST an admin account here. Accounts are made with `manage.py create_account`
    # (later an admin-only Accounts tab); only the profile/password actions below stay open.
    def _closed(self, *args, **kwargs):
        return Response({"error": "Accounts are managed by OSA administrators."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    create = update = partial_update = destroy = _closed

    @action(detail=False, methods=['post'])
    def update_profile(self, request):
        username = request.data.get('username')
        full_name = request.data.get('full_name')
        bio = request.data.get('bio')
        
        try:
            user = SystemUser.objects.get(username=username)
            if full_name: user.full_name = full_name
            if bio: user.bio = bio
            user.save()
            return Response({
                "success": True, 
                "full_name": user.full_name, 
                "bio": user.bio
            })
        except SystemUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        username = request.data.get('username')
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        try:
            user = SystemUser.objects.get(username=username)
            if verify_password(user.password, old_password)[0] and str(new_password or '').strip():
                user.password = hash_password(new_password)
                user.save()
                return Response({"success": True, "message": "Password updated successfully"})
            return Response({"error": "Incorrect old password"}, status=400)
        except SystemUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Check if the backend and database are connected"""
    try:
        # Check if we can reach the database
        user_count = SystemUser.objects.count()

        # (It used to create admin/admin, guard/guard and sample students whenever the
        # accounts list was empty. Accounts are now made with `manage.py create_account`.)

        return Response({
            "status": "healthy", 
            "database": "connected", 
            "users": user_count,
        })
    except Exception as e:
        return Response({"status": "error", "message": f"Database check failed: {str(e)}"}, status=500)
