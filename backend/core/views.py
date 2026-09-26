from rest_framework_mongoengine import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import Student, ViolationReport, ETicket, TimeLog, SystemUser, ServiceSite
from .serializers import StudentSerializer, ViolationReportSerializer, ETicketSerializer, TimeLogSerializer
import datetime
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
    if user:
        if user.password == password:
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
        # Get custom password if set
        stored_pw = getattr(student, 'password', None)
        
        is_valid = False
        if stored_pw and str(stored_pw).strip():
            # Match against custom password
            is_valid = (str(stored_pw) == str(password))
        else:
            # Match against fallback Student ID
            is_valid = (str(student.student_id) == str(password))

        if is_valid:
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
        time_elapsed = (datetime.datetime.now() - verification.created_at).total_seconds()
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
            password=data.get('password', '')
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
        if not verification or verification.otp != otp_input:
            return Response({"error": "Invalid or expired reset code."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check expiration (5 minutes)
        if (datetime.datetime.now() - verification.created_at).total_seconds() > 300:
            verification.delete()
            return Response({"error": "Reset code has expired."}, status=status.HTTP_400_BAD_REQUEST)
            
        student = Student.objects.filter(email__iexact=email).first()
        if not student:
            return Response({"error": "No account found with this email address."}, status=status.HTTP_404_NOT_FOUND)
        student.password = new_password
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
            
        stored_password = student.password if hasattr(student, 'password') and student.password else student.student_id
        if stored_password != current_password:
            return Response({"error": "Incorrect current password"}, status=status.HTTP_400_BAD_REQUEST)
            
        student.password = new_password
        student.save()
        return Response({"message": "Password updated successfully"})

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
    
    date_str = report.created_at.strftime("%B %d, %Y at %I:%M %p") if report.created_at else "Unknown"
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

class ViolationViewSet(viewsets.ModelViewSet):
    queryset = ViolationReport.objects.all()
    serializer_class = ViolationReportSerializer
    permission_classes = [AllowAny]


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
                    created_at=datetime.datetime.now()
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
                created_at=datetime.datetime.now()
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

            violation.status = "Approved"
            violation.assigned_building = assigned_building
            
            # Get custom hours if provided
            custom_hours = request.data.get('custom_hours')
            if custom_hours is not None and str(custom_hours).strip() != '':
                hours = float(custom_hours)
                violation.punishment = f"{hours} hours community service"
            else:
                punishment_info = get_punishment(violation.violation_type, violation.offense_count)
                hours = punishment_info["hours"]
                violation.punishment = punishment_info["punishment"]
            
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
        return ETicket.objects.all()

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
                log.time_out = datetime.datetime.now()
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
                open_log.time_out = datetime.datetime.now()
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
                    old_log.time_out = datetime.datetime.now()
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
                assigned_code = getattr(eticket, 'assigned_site_code', None)
                if assigned_code and site_code != assigned_code:
                    assigned = ServiceSite.objects.filter(site_code=assigned_code).first()
                    label = f"{assigned.name} ({assigned_code})" if assigned else assigned_code
                    return Response({"error": f"You're assigned to {label}. Scan the QR code posted there to start your timer."}, status=status.HTTP_400_BAD_REQUEST)

                if site_code:
                    # Registered service site: the geofence comes from the saved site, never from the phone
                    site = ServiceSite.objects.filter(site_code=site_code, is_active=True).first()
                    if not site:
                        return Response({"error": f"{site_code} is not an active service site."}, status=status.HTTP_400_BAD_REQUEST)
                    if not TimeLog.objects.filter(eticket=eticket, time_out=None).first():
                        eticket.lat = site.latitude
                        eticket.lng = site.longitude
                        eticket.radius = float(site.radius_m)
                        eticket.site_code = site.site_code
                        eticket.save()
                elif lat is not None and lng is not None:
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
                
                # Create new session only if none exists
                log = TimeLog(eticket=eticket).save()
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
                    log.time_out = datetime.datetime.now()
                    duration = (log.time_out - log.time_in).total_seconds()
                    log.duration_seconds = duration
                    log.save()
                    
                    hours_to_deduct = duration / 3600
                    eticket.remaining_hours = max(0, eticket.remaining_hours - hours_to_deduct)
                    if eticket.remaining_hours <= 0.01:
                        eticket.remaining_hours = 0
                        eticket.status = "Completed"
                        eticket.violation.status = "Completed"
                        eticket.violation.save()
                    else:
                        eticket.status = "Active"
                    eticket.save()
                    
                    return Response(TimeLogSerializer(log).data)
                return Response({"error": "No active session"}, status=status.HTTP_400_BAD_REQUEST)
        except ETicket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

from .serializers import SystemUserSerializer

class SystemUserViewSet(viewsets.ModelViewSet):
    queryset = SystemUser.objects.all()
    serializer_class = SystemUserSerializer
    permission_classes = [AllowAny]
    lookup_field = 'username'

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
            if user.password == old_password:
                user.password = new_password
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
        
        # AUTO-SEED TRIGGER: If live DB is empty, fill it once!
        if user_count == 0:
            print("HEALTH: Empty DB detected, seeding...")
            # Create Default Users
            SystemUser(username="admin", password="admin", role="admin").save()
            SystemUser(username="guard", password="guard", role="guard").save()
            SystemUser(username="faculty", password="faculty", role="faculty").save()
            # Create Students
            initial_students = [
                {"id": "2023303188", "name": "Vincent Dagaraga", "contact": "09358541420", "email": "vinsdagaraga@gmail.com"},
                {"id": "2023303189", "name": "Mark Tajeros", "contact": "09358731470", "email": "marktajeros@gmail.com"},
                {"id": "2023303199", "name": "Nyko Quezon", "contact": "09356782310", "email": "nykoquezon@gmail.com"},
                {"id": "2023303179", "name": "Christian James Ambongan", "contact": "09356730509", "email": "cjambongan@gmail.com"},
                {"id": "2023303178", "name": "Dominic Wacan", "contact": "09358359302", "email": "dominicwacan@gmail.com"}
            ]
            for s in initial_students:
                # UPSERT: Find existing or create new
                student = Student.objects.filter(student_id=s["id"]).first()
                if not student:
                    student = Student(student_id=s["id"])
                
                # Always update fields to match latest seed data
                student.name = s["name"]
                student.course = "BSIT"
                student.department = "CITC"
                student.contact_number = s.get("contact", "")
                student.email = s.get("email", "")
                student.save()
            user_count = SystemUser.objects.count()

        return Response({
            "status": "healthy", 
            "database": "connected", 
            "users": user_count,
            "seeding": "Success" if user_count > 0 else "Pending"
        })
    except Exception as e:
        return Response({"status": "error", "message": f"Database check failed: {str(e)}"}, status=500)
