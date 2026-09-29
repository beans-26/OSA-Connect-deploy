from rest_framework_mongoengine import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import Student, ViolationReport, ETicket, TimeLog, SystemUser, ServiceSite, ClearanceProof, utc_now
from .serializers import StudentSerializer, ViolationReportSerializer, ETicketSerializer, TimeLogSerializer
from .passwords import hash_password, verify_password, check_and_upgrade
from .emails import send_code_email, send_violation_notice
from .deadlines import apply_missed_day_hours
from .auth import issue_token, forget_account, IsAdmin, IsReporter, IsStudent, IsLoggedIn, owns_ticket, role_of
from mongoengine.errors import ValidationError as MongoValidationError, NotUniqueError
from bson.errors import InvalidId
import base64
import binascii
import datetime
import re
import urllib.parse
from django.core import signing
from django.conf import settings



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
                "token": issue_token(user.role, user.username, user.password),
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
                "token": issue_token('student', student.student_id, student.password),
                "role": "student",
                "username": student.student_id,
                "student_id": student.student_id,
                "name": student.name
            })

    # Default rejection
    return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

GENDERS = ('Male', 'Female')


def _gender(value):
    """'Male' or 'Female' from any capitalization, else None (gender is optional for older clients)."""
    value = str(value or '').strip().capitalize()
    return value if value in GENDERS else None


def student_id_error(sid):
    """Error for a Student ID that can't be a USTP ID (numbers only, 6-12 digits), else None."""
    if not (sid.isdigit() and 6 <= len(sid) <= 12):
        return "Student ID must be numbers only, like 2023303188."
    return None


def _registration_details_error(data, require_all):
    """Returns an error message for a taken or malformed Student ID or a bad contact number, else None.
    A record made from a guard's report (no password yet) doesn't count as taken: registering claims it.
    Names may repeat; the Student ID tells students apart."""
    sid = str(data.get('student_id', '')).strip()
    contact = str(data.get('contact_number', '')).strip()

    if require_all and not sid:
        return "Student ID is required."
    if sid:
        format_error = student_id_error(sid)
        if format_error:
            return format_error
        existing = Student.objects.filter(student_id=sid).first()
        if existing and existing.password:
            return f"Student ID {sid} is already registered."

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


def site_assigned_counts(sites=None):
    """{site_code: students with an open ticket there}. Older tickets only saved the site's name.
    Pass `sites` when they're already loaded, to save a query."""
    sites = sites if sites is not None else ServiceSite.objects.only('name', 'site_code')
    code_by_name = {s.name.lower(): s.site_code for s in sites}
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

    # Registration and password reset work without logging in; the rest needs the right login
    PUBLIC_ACTIONS = ('request_otp', 'register_with_otp', 'request_password_reset', 'reset_password')
    SELF_ACTIONS = ('change_password', 'request_email_change', 'confirm_email_change', 'update_contact')

    def get_permissions(self):
        if self.action in self.PUBLIC_ACTIONS:
            return [AllowAny()]
        if self.action in self.SELF_ACTIONS:
            return [IsStudent()]
        if self.action == 'retrieve':
            return [IsLoggedIn()]
        return [IsAdmin()]

    def retrieve(self, request, *args, **kwargs):
        # A student sees only their own profile; guards, staff and admins look students up by ID
        if role_of(request) == 'student' and kwargs.get('student_id') != request.user.username:
            return Response({"error": "You can only view your own profile."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def request_otp(self, request):
        import random
        from django.conf import settings
        from .models import OTPVerification
        
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # (A guard's report may already hold this email on the student's own unregistered record)
        sid = str(request.data.get('student_id') or '').strip()
        if Student.objects.filter(email__iexact=email, student_id__ne=sid).first():
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
        
        try:
            # name is optional (older app builds don't send it); used only for the greeting
            send_code_email(email, otp, 'register', name=request.data.get('name'))
            return Response({"message": "OTP sent successfully"})
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}" if settings.DEBUG else "Failed to send email. Check your connection."
            return Response({"error": error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def register_with_otp(self, request):
        from .models import OTPVerification
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
        if Student.objects.filter(email__iexact=email, student_id__ne=sid).first():
            return Response({"error": "This email is already registered to another student."}, status=status.HTTP_400_BAD_REQUEST)

        # A guard may have reported this ID before the student registered: that record becomes the
        # student's account, so the violations already filed stay attached to them
        student = Student.objects.filter(student_id=sid).first()
        if student and student.password:
            return Response({"error": f"Student ID {sid} is already registered."}, status=status.HTTP_400_BAD_REQUEST)
        student = student or Student(student_id=sid)
        student.name = name
        student.course = data.get('course', '')
        student.department = data.get('department', '')
        student.year_level = data.get('year_level', '')
        student.gender = _gender(data.get('gender')) or student.gender
        student.email = email
        student.contact_number = str(data.get('contact_number', '')).strip()
        student.password = hash_password(data.get('password', ''))
        student.save()
        
        return Response(StudentSerializer(student).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def request_password_reset(self, request):
        import random
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
            send_code_email(student.email, otp, 'reset', name=student.name)
            return Response({"message": "Reset code sent to your email."})
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}" if settings.DEBUG else "Failed to send email. Check your connection."
            return Response({"error": error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def reset_password(self, request):
        from .models import OTPVerification
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
        forget_account(student.student_id)  # old logins stop working now
        student.save()
        verification.delete()
        
        return Response({"message": "Password reset successful. You can now log in."})

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        data = request.data
        student_id = request.user.username  # the logged-in student, never one named in the request
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
        forget_account(student.student_id)  # old logins stop working now
        student.save()
        return Response({"message": "Password updated successfully"})

    # ── Student Settings: email (verified by a code sent to the new address) and contact number ──

    def _student_with_password(self, data):
        """(student, error Response). Account changes need the current password."""
        student = Student.objects.filter(student_id=self.request.user.username).first()
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
            send_code_email(new_email, otp, 'email_change', name=student.name)
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}" if settings.DEBUG else "Failed to send email. Check your connection."
            return Response({"error": error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({"message": f"We sent a 6-digit code to {new_email}."})

    @action(detail=False, methods=['post'])
    def confirm_email_change(self, request):
        from .models import OTPVerification

        student = Student.objects.filter(student_id=request.user.username).first()
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

        if sid and Student.objects.filter(student_id=sid).first():
            return Response({"error": f"Student ID '{sid}' is already in use."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Names may repeat; the Student ID tells students apart
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        try:
            student = self.get_object()
            data = request.data
            
            # 1. Name (may repeat; the Student ID tells students apart)
            new_name = data.get('name', '').strip()
            if new_name:
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
            if 'gender' in data:
                student.gender = _gender(data.get('gender'))

            student.save()
            serializer = self.get_serializer(student)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

PUNISHMENT_SYSTEM = {
    # The violations guards and faculty & staff report (their report forms list exactly these)
    "Curfew Violation": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "No ID / Improper ID Sling": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "No School Uniform": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "Dress Code Violation": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
}

# Applied to violation types that aren't in PUNISHMENT_SYSTEM
DEFAULT_PUNISHMENT = {"punishment": "To be determined", "hours": 4}

# Keeps every violation record small: a guard's note is a few sentences, never pages of text
MAX_DESCRIPTION_CHARS = 1000


def _short(value, limit):
    """Text from a request, trimmed and cut to at most limit characters."""
    return str(value or '').strip()[:limit]


def get_offense_count(student, violation_type):
    """Count how many times this student has committed this violation type"""
    # Dismissed reports were found not to be violations, so they don't raise the offense number
    count = ViolationReport.objects.filter(
        student=student,
        violation_type=violation_type,
        status__ne="Dismissed"
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
        
    try:
        # Wording, Philippine time and the plain + HTML versions live in core/emails.py
        send_violation_notice(report)
        print(f"EMAIL SUCCESS: Notification sent to {student.email}")
        return True
    except Exception as e:
        print(f"EMAIL ERROR: Failed to send to {student.email}. Error: {str(e)}")
        return False

def _building_entry(name, request):
    """One building_history item: which building, when (ISO time with its UTC offset), and which admin."""
    return {'name': name, 'at': _aware_iso(utc_now()), 'by': request.user.name or request.user.username}


def _history_with_first(violation, request):
    """The violation's building history; violations approved before it was kept start with their current
    building (time unknown), so a change doesn't lose where they were first."""
    history = list(violation.building_history or [])
    if not history and violation.assigned_building:
        history = [{'name': violation.assigned_building, 'at': None, 'by': None}]
    return history


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

    def get_permissions(self):
        if self.action == 'punishments':
            return [AllowAny()]  # the penalty table on the Help pages
        if self.action == 'create':
            return [IsReporter()]
        if self.action == 'list':
            return [IsLoggedIn()]
        if self.action == 'summary':
            return [IsReporter()]  # counts only, for the guards' analytics
        return [IsAdmin()]  # approve, dismiss, reassign, clearance, bulk reports, analytics, edits

    def get_queryset(self):
        role = role_of(self.request)
        if self.action == 'list' and role == 'student':
            # A student only ever gets their own violations
            me = Student.objects(student_id=self.request.user.username).first()
            return ViolationReport.objects(student=me).select_related() if me else ViolationReport.objects.none()
        if self.action == 'list' and role in ('guard', 'staff'):
            # Guards and faculty & staff see the reports they filed
            names = [n for n in (self.request.user.name, self.request.user.username) if n]
            return ViolationReport.objects(reporting_guard__in=names).select_related()
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
                    building_history=[_building_entry(assigned_building, request)],
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
        student_id = data.get('student_id')
        if not student_id:
            # Fallback for old field name just in case
            student_id = data.get('studentId')
            
        if not student_id:
            return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        student_id = str(student_id).strip()
        id_error = student_id_error(student_id)
        if id_error:
            return Response({"error": id_error}, status=status.HTTP_400_BAD_REQUEST)

        # 1. The report goes to the student with this ID, and only by ID: names can repeat, and
        # matching by name used to attach reports to the wrong person
        student = Student.objects.filter(student_id=student_id).first()
        if not student:
            # Not registered yet: keep the report under the ID with the details the guard entered.
            # This record can't log in; when the student registers with this ID it becomes their
            # account and keeps this report (StudentViewSet.register_with_otp).
            student = Student(
                student_id=student_id,
                name=_short(data.get('name'), 100) or 'Unregistered student',
                course=_short(data.get('course'), 100) or 'Unknown',
                department=_short(data.get('department'), 100) or 'Unknown',
                contact_number=_short(data.get('contact'), 20),
                email=_short(data.get('email'), 254).lower(),
                gender=_gender(data.get('gender')),
            ).save()
        elif not student.gender and _gender(data.get('gender')):
            # The guard saw the student: fills in the gender for records that don't have it yet
            student.gender = _gender(data.get('gender'))
            student.save()
            
        # 2. Calculate offense count and punishment
        violation_type = _short(data.get('violation_type') or data.get('violation'), 150) or 'Other'
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
                description=_short(data.get('description'), MAX_DESCRIPTION_CHARS),
                # Who filed it comes from the login (only admins may name someone else)
                reporting_guard=(data.get('reporting_guard') or 'OSA Administrator') if role_of(request) == 'admin'
                else (request.user.name or request.user.username),
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
            
            if violation.status != "Pending OSA Review":
                return Response({"error": "This violation was already reviewed by someone else."}, status=status.HTTP_409_CONFLICT)

            # Get custom hours if provided
            custom_hours = request.data.get('custom_hours')
            if custom_hours is not None and str(custom_hours).strip() != '':
                hours = float(custom_hours)
                if not 0 <= hours <= 100:
                    return Response({"error": "Required hours must be between 0 and 100."}, status=status.HTTP_400_BAD_REQUEST)
                punishment = f"{hours} hours community service"
            else:
                punishment_info = get_punishment(violation.violation_type, violation.offense_count)
                hours = punishment_info["hours"]
                punishment = punishment_info["punishment"]

            # Only students who get a ticket take a place at the site
            full = _over_capacity(assigned_site, 1 if hours > 0 else 0, request)
            if full:
                return full

            # Claim the case in one database step: it only changes if it's still pending. When two admins
            # act at the same moment (approve + approve, or approve + dismiss), exactly one claim succeeds
            # and only an approval that won makes the e-ticket; the other admin is told it was reviewed.
            claimed = ViolationReport.objects(id=violation.id, status="Pending OSA Review").update_one(
                set__status="Approved", set__assigned_building=assigned_building, set__punishment=punishment,
                push__building_history=_building_entry(assigned_building, request))
            if not claimed:
                return Response({"error": "This violation was already reviewed by someone else."}, status=status.HTTP_409_CONFLICT)
            violation.reload()

            # Only create E-Ticket if there are hours to serve
            if hours > 0:
                try:
                    ticket = ETicket(
                        violation=violation,
                        assigned_location=assigned_building,
                        total_hours_required=hours,
                        remaining_hours=hours,
                        status="Active",
                        **_site_ticket_fields(assigned_site)
                    ).save()
                except NotUniqueError:
                    # The database allows one e-ticket per violation (the backup for the claim above)
                    return Response({"error": "This violation already has an e-ticket."}, status=status.HTTP_409_CONFLICT)
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
        violation.building_history = _history_with_first(violation, request) + [_building_entry(site.name, request)]
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
            # Same one-step claim as approve: only a still-pending case can be dismissed, so an approve
            # and a dismiss at the same moment can't both happen
            dismissed = ViolationReport.objects(id=violation_id, status="Pending OSA Review").update_one(set__status="Dismissed")
            if not dismissed:
                return Response({"error": "This violation was already reviewed by someone else."}, status=status.HTTP_409_CONFLICT)
            print(f"Violation {violation_id} DISMISSED.")
            return Response({"message": "Violation Dismissed."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Violation counts by department, violation type, gender, year level and course (no names), for
        the guards' analytics. Dismissed reports aren't counted. ?period=day|month|quarter|year limits it to
        the current one (Philippine time); anything else counts everything."""
        from collections import Counter
        reports = ViolationReport.objects(status__ne="Dismissed").only('student', 'violation_type', 'created_at')
        start = _period_start(request.query_params.get('period'))
        if start:
            reports = reports.filter(created_at__gte=start)
        reports = list(reports)
        student_ids = {getattr(r._data.get('student'), 'id', r._data.get('student')) for r in reports if r._data.get('student') is not None}
        students = {s.id: s for s in Student.objects(id__in=list(student_ids)).only('department', 'gender', 'year_level', 'course')}

        def year_label(value):
            value = str(value or '').strip()
            return f"Year {value}" if value.isdigit() else value

        counters = {key: Counter() for key in ('department', 'violation_type', 'gender', 'year_level', 'course')}
        for r in reports:
            ref = r._data.get('student')
            st = students.get(getattr(ref, 'id', ref))
            counters['violation_type'][r.violation_type or 'Other'] += 1
            counters['department'][(st.department if st else None) or 'Not recorded'] += 1
            counters['gender'][(st.gender if st else None) or 'Not recorded'] += 1
            counters['year_level'][(year_label(st.year_level) if st else None) or 'Not recorded'] += 1
            counters['course'][(st.course if st else None) or 'Not recorded'] += 1
        return Response({
            'total': len(reports),
            **{key: [{'label': k, 'count': v} for k, v in c.most_common()] for key, c in counters.items()},
        })

    def _clearance_violation(self, kwargs):
        try:
            return ViolationReport.objects.get(id=kwargs.get('id') or kwargs.get('pk'))
        except Exception:
            return None

    @action(detail=True, methods=['get', 'post'])
    def clearance_proof(self, request, *args, **kwargs):
        """The two clearance documents, ?kind=iso_form (the signed ISO form) or ?kind=reflection (the
        reflection paper). GET: the photo. POST {kind, image}: upload or replace it (a JPEG data URL).
        Only once the student has served all the hours."""
        violation = self._clearance_violation(kwargs)
        if not violation:
            return Response({"error": "Violation not found."}, status=status.HTTP_404_NOT_FOUND)
        kind = request.query_params.get('kind') or request.data.get('kind')
        if kind not in CLEARANCE_FILES:
            return Response({"error": "kind must be iso_form or reflection."}, status=status.HTTP_400_BAD_REQUEST)
        name = CLEARANCE_FILES[kind]
        if request.method == 'GET':
            proof = ClearanceProof.objects(violation=violation, kind=kind).first()
            if not proof and violation.photos_removed_at:
                return Response({"error": f"The photo of the {name} was removed {PHOTO_KEEP_LABEL} after the case "
                                          f"was cleared, to save space. The case record is kept."}, status=status.HTTP_410_GONE)
            if not proof:
                return Response({"error": f"No {name} uploaded yet."}, status=status.HTTP_404_NOT_FOUND)
            return Response({"kind": kind, "image": _proof_data_url(proof), "uploaded_at": _aware_iso(proof.uploaded_at), "uploaded_by": proof.uploaded_by})

        return _save_clearance_file(violation, kind, request.data.get('image'), request.user.name or request.user.username)

    @action(detail=True, methods=['post'])
    def capture_link(self, request, *args, **kwargs):
        """A link for the admin's phone (shown as a QR code): it opens a page that takes the photos of the
        clearance documents with the phone camera, no login needed. Works only for this violation and
        expires after CAPTURE_LINK_MAX_AGE_S."""
        violation = self._clearance_violation(kwargs)
        if not violation:
            return Response({"error": "Violation not found."}, status=status.HTTP_404_NOT_FOUND)
        error = _clearance_upload_error(violation)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
        token = signing.dumps({'v': str(violation.id), 'by': request.user.name or request.user.username}, salt=CAPTURE_SALT)
        return Response({"token": token, "expires_in": CAPTURE_LINK_MAX_AGE_S})

    @action(detail=True, methods=['post'])
    def clear(self, request, *args, **kwargs):
        """Approves the uploaded ISO form and reflection paper: the violation is cleared and moves to the archives."""
        violation = self._clearance_violation(kwargs)
        if not violation:
            return Response({"error": "Violation not found."}, status=status.HTTP_404_NOT_FOUND)
        if violation.status == "Cleared":
            return Response({"error": "This violation is already cleared."}, status=status.HTTP_409_CONFLICT)
        ticket = ETicket.objects(violation=violation).first()
        if not ticket or ticket.status != "Completed":
            return Response({"error": "The student hasn't finished the service hours yet."}, status=status.HTTP_400_BAD_REQUEST)
        uploaded = set(ClearanceProof.objects(violation=violation).distinct('kind'))
        missing = [name for kind, name in CLEARANCE_FILES.items() if kind not in uploaded]
        if missing:
            return Response({"error": f"Upload the {' and the '.join(missing)} first."}, status=status.HTTP_400_BAD_REQUEST)
        now = utc_now()
        violation.status = "Cleared"
        violation.cleared_at = now
        violation.cleared_by = request.user.name or request.user.username
        violation.save()
        ticket.status = "Cleared"
        ticket.save()
        return Response({"message": "Violation cleared and moved to the archives.", "cleared_at": _aware_iso(now)})


# The documents a student brings to OSA to clear a violation (ClearanceProof.kind)
CLEARANCE_FILES = {'iso_form': 'signed ISO form', 'reflection': 'reflection paper'}

# Phone capture links (ViolationViewSet.capture_link): signed, one violation each, valid this long
CAPTURE_SALT = 'clearance-capture'
CAPTURE_LINK_MAX_AGE_S = 30 * 60

# The browser shrinks each clearance photo to about 50-90 KB (frontend lib/photo.js); anything over
# 200 KB didn't come through that and is refused. Photos are saved as the file's bytes, not the base64
# text the browser sends (a third smaller), so a cleared case takes about 0.2 MB at most.
MAX_CLEARANCE_PHOTO_BYTES = 200_000
DATA_URL = re.compile(r'^data:(image/(?:jpeg|png|webp));base64,(.+)$', re.S)

# Photos of a cleared case are deleted this long after it was cleared, to keep the database small;
# the case itself (who, what, hours, dates) stays in the archives. Runs with the ticket list, a few times a day.
PHOTO_KEEP_DAYS = 365
PHOTO_KEEP_LABEL = 'one year'
PHOTO_CLEANUP_EVERY_S = 6 * 3600
_last_photo_cleanup = [0.0]


def _proof_data_url(proof):
    """The photo as a data URL, the form both dashboards show."""
    if proof.data:
        return f"data:{proof.content_type or 'image/jpeg'};base64,{base64.b64encode(proof.data).decode('ascii')}"
    return proof.image  # saved as text before 2026-09-30


def remove_old_clearance_photos(force=False):
    """Deletes the photos of cases cleared more than PHOTO_KEEP_DAYS ago. Returns how many cases it did."""
    import time
    if not force and time.monotonic() - _last_photo_cleanup[0] < PHOTO_CLEANUP_EVERY_S:
        return 0
    _last_photo_cleanup[0] = time.monotonic()
    try:
        cutoff = utc_now() - datetime.timedelta(days=PHOTO_KEEP_DAYS)
        ids = [v.id for v in ViolationReport.objects(status="Cleared", cleared_at__lt=cutoff, photos_removed_at=None).only('id')]
        if not ids:
            return 0
        ClearanceProof.objects(violation__in=ids).delete()
        ViolationReport.objects(id__in=ids).update(set__photos_removed_at=utc_now())
        return len(ids)
    except Exception as e:
        print(f"remove_old_clearance_photos: {e}")
        return 0


def _clearance_upload_error(violation):
    """Why clearance photos can't be added to this violation now, else None."""
    if violation.status == "Cleared":
        return "This violation is already cleared."
    ticket = ETicket.objects(violation=violation).first()
    if not ticket or ticket.status != "Completed":
        return "The student hasn't finished the service hours yet."
    return None


def _save_clearance_file(violation, kind, image, uploader):
    """Saves (or replaces) one clearance photo, sent as a JPEG/PNG/WebP data URL, and returns the Response."""
    error = _clearance_upload_error(violation)
    if error:
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
    match = DATA_URL.match(str(image or ''))
    try:
        # the length check first, so a huge upload isn't decoded
        data = base64.b64decode(match.group(2), validate=True) if match and len(match.group(2)) <= MAX_CLEARANCE_PHOTO_BYTES * 4 // 3 + 4 else None
    except (binascii.Error, ValueError):
        match = None
    if not match:
        return Response({"error": f"Upload a photo of the {CLEARANCE_FILES[kind]} (JPG or PNG)."}, status=status.HTTP_400_BAD_REQUEST)
    if data is None or len(data) > MAX_CLEARANCE_PHOTO_BYTES:
        return Response({"error": "The photo is too large. Try again with a smaller photo."}, status=status.HTTP_400_BAD_REQUEST)
    now = utc_now()
    ClearanceProof.objects(violation=violation, kind=kind).update_one(
        set__data=data, set__content_type=match.group(1), unset__image=True,
        set__uploaded_at=now, set__uploaded_by=uploader, upsert=True)
    setattr(violation, f'{kind}_uploaded_at', now)
    violation.save()
    return Response({"kind": kind, "uploaded_at": _aware_iso(now), "uploaded_by": uploader})


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def clearance_capture(request, token):
    """The phone page opened from the capture QR code. GET: whose violation it is and what's uploaded.
    POST {kind, image}: saves a photo. The signed token is the permission (see capture_link)."""
    # The page sends the token URL-encoded (its ':' as %3A) and Vercel passes the path on without decoding it
    token = urllib.parse.unquote(token)
    try:
        data = signing.loads(token, salt=CAPTURE_SALT, max_age=CAPTURE_LINK_MAX_AGE_S)
    except signing.SignatureExpired:
        return Response({"error": "This QR code has expired. Show a new one on the computer and scan it again."}, status=status.HTTP_410_GONE)
    except signing.BadSignature:
        return Response({"error": "This link isn't valid. Scan the QR code on the computer again."}, status=status.HTTP_400_BAD_REQUEST)
    violation = ViolationReport.objects(id=data.get('v')).first()
    if not violation:
        return Response({"error": "Violation not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        student = violation.student
        return Response({
            "student_name": student.name if student else None,
            "student_id": student.student_id if student else None,
            "violation_type": violation.violation_type,
            "uploaded": {kind: bool(getattr(violation, f'{kind}_uploaded_at')) for kind in CLEARANCE_FILES},
            "error": _clearance_upload_error(violation),
        })

    kind = request.data.get('kind')
    if kind not in CLEARANCE_FILES:
        return Response({"error": "kind must be iso_form or reflection."}, status=status.HTTP_400_BAD_REQUEST)
    return _save_clearance_file(violation, kind, request.data.get('image'), f"{data.get('by') or 'Admin'} (phone)")


def _period_start(period):
    """Start of the current day, month, quarter or year in Philippine time, as naive UTC; None otherwise."""
    ph = datetime.timezone(datetime.timedelta(hours=8))
    now = datetime.datetime.now(ph)
    if period == 'day':
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'month':
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == 'quarter':
        start = now.replace(month=(now.month - 1) // 3 * 3 + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == 'year':
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        return None
    return start.astimezone(datetime.timezone.utc).replace(tzinfo=None)


class ETicketViewSet(viewsets.ModelViewSet):
    queryset = ETicket.objects.all()
    serializer_class = ETicketSerializer

    def get_permissions(self):
        # Students list their own tickets and print its form; changing tickets is admin-only
        return [IsLoggedIn()] if self.action in ('list', 'print_iso_form') else [IsAdmin()]

    def get_queryset(self):
        role = role_of(self.request)
        if role == 'student':
            me = Student.objects(student_id=self.request.user.username).first()
            if not me:
                return ETicket.objects.none()
            return ETicket.objects(violation__in=ViolationReport.objects(student=me).only('id')).select_related(max_depth=2)
        if role != 'admin':
            return ETicket.objects.none()
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
        apply_missed_day_hours()
        remove_old_clearance_photos()
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

    @action(detail=True, methods=['post'])
    def print_iso_form(self, request, id=None):
        """Kept for app versions that asked before downloading the ISO form (it was once per ticket).
        The forms can now be downloaded any number of times, so this always allows it."""
        return Response({"printed": True})


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


# Tracked sessions: outside the site this long ends the session (same as the dashboards' countdown).
# Turning location off is reported by the app within seconds and ends the session right away.
# Hearing nothing at all is different: Android delays background location to save battery, so a
# silent phone gets NO_LOCATION_LIMIT_S before the session ends as "location lost".
OUT_OF_AREA_LIMIT_S = 30
NO_LOCATION_LIMIT_S = 120
SILENT_CHECK_EVERY_S = 15  # the check below runs at most this often per server process
_last_silent_check = [0.0]


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
    the last confirmed location counts. Runs when tickets are listed (dashboards poll every 5 s),
    at most every SILENT_CHECK_EVERY_S so the polls don't each pay for an extra query."""
    import time
    if time.monotonic() - _last_silent_check[0] < SILENT_CHECK_EVERY_S:
        return
    _last_silent_check[0] = time.monotonic()
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

    def get_permissions(self):
        # Timing actions: a student on their own ticket (checked in each action) or an admin
        if self.action in ('log_time', 'location_ping', 'log_event', 'receipts'):
            return [IsLoggedIn()]
        return [IsAdmin()]

    def _forbidden_ticket(self):
        return Response({"error": "This isn't your e-ticket."}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=False, methods=['post'])
    def log_time(self, request):
        eticket_id = request.data.get('eticket_id')
        action_type = request.data.get('action') # 'in' or 'out'
        
        try:
            eticket = ETicket.objects.get(id=eticket_id)
            if not owns_ticket(request, eticket):
                return self._forbidden_ticket()

            # 'custom' and 'set_start' used to set a ticket's remaining hours directly
            if action_type in ('custom', 'set_start'):
                return Response({"error": "This action is no longer available."}, status=status.HTTP_400_BAD_REQUEST)

            if action_type == 'in':
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
        if not owns_ticket(request, eticket):
            return self._forbidden_ticket()
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
        if not owns_ticket(request, eticket):
            return self._forbidden_ticket()
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
        if role_of(request) == 'student':
            student_id = request.user.username  # students only see their own receipts
        if eticket_id:
            try:
                tickets = list(ETicket.objects(id=eticket_id))
            except (MongoValidationError, InvalidId):
                tickets = []
            if tickets and not owns_ticket(request, tickets[0]):
                return self._forbidden_ticket()
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
    lookup_field = 'username'

    def get_permissions(self):
        # Staff, guards and admins change their own password/profile; listing accounts is admin-only
        if self.action in ('change_password', 'update_profile'):
            return [IsReporter()]
        return [IsAdmin()]

    # Anyone could POST an admin account here. Accounts are made with `manage.py create_account`
    # (later an admin-only Accounts tab); only the profile/password actions below stay open.
    def _closed(self, *args, **kwargs):
        return Response({"error": "Accounts are managed by OSA administrators."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    create = update = partial_update = destroy = _closed

    @action(detail=False, methods=['post'])
    def update_profile(self, request):
        username = request.user.username  # always the logged-in account
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
        username = request.user.username  # always the logged-in account
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        try:
            user = SystemUser.objects.get(username=username)
            if verify_password(user.password, old_password)[0] and str(new_password or '').strip():
                user.password = hash_password(new_password)
                forget_account(user.username)  # old logins stop working now
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
