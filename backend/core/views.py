from rest_framework_mongoengine import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import Student, ViolationReport, ETicket, TimeLog, SystemUser, ServiceSite, ClearanceProof, FacultyInvite, utc_now, format_person_name, display_student_name, faculty_reporter_status
from mongoengine.queryset.visitor import Q
from .serializers import StudentSerializer, ViolationReportSerializer, ETicketSerializer, TimeLogSerializer
from .passwords import hash_password, verify_password, check_and_upgrade
from .emails import send_code_email, send_violation_notice, send_faculty_invite, send_faculty_activated, app_url
from .deadlines import apply_missed_day_hours
from .auth import issue_token, forget_account, IsAdmin, IsReporter, IsStudent, IsLoggedIn, owns_ticket, role_of
from mongoengine.errors import ValidationError as MongoValidationError, NotUniqueError
from bson.errors import InvalidId
import base64
import binascii
import datetime
import re
import secrets
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
    # A faculty sign-up OSA hasn't confirmed (or rejected): say so, but only to someone with the right password
    if user and user.is_active is False and user.faculty_status in ('pending', 'rejected') and verify_password(user.password, password)[0]:
        message = PENDING_FACULTY_LOGIN if user.faculty_status == 'pending' else REJECTED_FACULTY_LOGIN
        return Response({"error": message, "faculty_status": user.faculty_status}, status=status.HTTP_403_FORBIDDEN)

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


STUDENT_ID_LENGTH = 10  # USTP IDs, e.g. 2023303188

# Name of a record made from a report before the student registered (registering replaces it)
UNREGISTERED_NAME = 'Unregistered Student'


def student_id_error(sid):
    """Error for a Student ID that can't be a USTP ID (exactly STUDENT_ID_LENGTH numbers), else None.
    Same rule as the registration and report forms (web and app)."""
    if not (sid.isdigit() and len(sid) == STUDENT_ID_LENGTH):
        return f"Student ID must be exactly {STUDENT_ID_LENGTH} numbers, like 2023303188."
    return None


# The middle name is required and written out in full ("Santos", "Dela Cruz"), never an initial ("S", "S."):
# every word at least 2 letters, no periods. Students without one type "N/A". Same rule as
# frontend/src/lib/names.js and mobile/components/names.js.
MIDDLE_NAME_WORD = re.compile(r"^[^\W\d_]+(?:['-][^\W\d_]+)*$")
NO_MIDDLE_NAME = re.compile(r"^n\s*/?\s*a$", re.I)  # N/A, n/a, NA
MIDDLE_NAME_REQUIRED = "Type your middle name, or N/A if you don't have one."
MIDDLE_NAME_ERROR = "Type your full middle name (for example Santos), not just the initial. Type N/A if you don't have one."


def middle_name_error(value, required=True):
    """Error for the registration's middle name: missing, or only an initial. None for a full name or N/A."""
    value = str(value or '').strip()
    if not value:
        return MIDDLE_NAME_REQUIRED if required else None
    if NO_MIDDLE_NAME.match(value):
        return None
    words = value.split()
    if '.' in value or not all(MIDDLE_NAME_WORD.match(w) and len(re.sub(r"['-]", '', w)) >= 2 for w in words):
        return MIDDLE_NAME_ERROR
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

    # Required when registering (require_all); the code request doesn't send it
    return middle_name_error(data.get('middle_name'), required=require_all)


def _resolve_service_site(value):
    """The active service site picked in an "Assign Building" dropdown (by site code, or by name for older clients)."""
    value = str(value or '').strip()
    if not value:
        return None
    return (ServiceSite.objects.filter(site_code=value.upper(), is_active=True).first()
            or ServiceSite.objects.filter(name__iexact=value, is_active=True).first())


# Admin list scopes (?scope=): 'open' = cases still being worked on, plus anything reported in the last
# 36 hours (the dashboard counts today's reports, dismissed ones too); 'archived' = finished cases.
# Without a scope, everything (Analytics needs the whole history for its reports).
OPEN_RECENT_HOURS = 36


def _scoped_violations(qs, scope):
    if scope == 'open':
        recent = utc_now() - datetime.timedelta(hours=OPEN_RECENT_HOURS)
        return qs.filter(Q(status__nin=['Cleared', 'Dismissed']) | Q(created_at__gte=recent))
    if scope == 'archived':
        # Dismissed reports too (the Archives' Dismissed tab)
        return qs.filter(status__in=['Cleared', 'Completed', 'Dismissed'])
    return qs


def ticket_list_extras(tickets):
    """What ETicketSerializer would otherwise look up once per ticket, loaded for a whole list in four queries:
    open tickets with time served today, the running session's start, the end of the last session (finished
    tickets saved before completed_at existed), and the active service sites by code and by name."""
    from .deadlines import _utc_midnight, PH
    logs = TimeLog._get_collection()
    active = [t.id for t in tickets if t.status == 'Active']
    ongoing = [t.id for t in tickets if t.status == 'Ongoing']
    unfinished_at = [t.id for t in tickets if t.status == 'Completed' and not t.completed_at]
    today_start = _utc_midnight(utc_now().replace(tzinfo=datetime.timezone.utc).astimezone(PH).date())
    served_today = set(logs.distinct('eticket', {'eticket': {'$in': active}, 'time_in': {'$gte': today_start}})) if active else set()
    # The running session: when it started, and its time outside the site so far (not counted as served)
    open_since = {d['eticket']: d for d in logs.find({'eticket': {'$in': ongoing}, 'time_out': None},
                                                    {'eticket': 1, 'time_in': 1, 'paused_seconds': 1, 'outside_since': 1})} if ongoing else {}
    last_out = {d['_id']: d['t'] for d in logs.aggregate([
        {'$match': {'eticket': {'$in': unfinished_at}, 'time_out': {'$ne': None}}},
        {'$group': {'_id': '$eticket', 't': {'$max': '$time_out'}}},
    ])} if unfinished_at else {}
    sites = {}
    for site in ServiceSite.objects(is_active=True).only('site_code', 'name'):
        sites[site.site_code.upper()] = site.site_code
        sites.setdefault((site.name or '').strip().lower(), site.site_code)
    return {'served_today': served_today, 'open_since': open_since, 'last_out': last_out, 'sites': sites}


def _assigned_site_code(eticket, sites=None):
    """Site code the ticket must be served at. Tickets approved before sites were linked only saved
    the site's name as assigned_location, so fall back to matching that name."""
    code = getattr(eticket, 'assigned_site_code', None)
    if code:
        return code
    if sites is not None:  # a list: the sites were loaded once (ticket_list_extras)
        name = str(eticket.assigned_location or '').strip()
        return sites.get(name.upper()) or sites.get(name.lower())
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
    PUBLIC_ACTIONS = ('request_otp', 'register_with_otp', 'request_password_reset', 'verify_reset_code', 'reset_password')
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
        # The parts, for "First M. Last" on the pages ("N/A": no middle name)
        student.first_name = _short(data.get('first_name'), 50) or None
        student.middle_name = _short(data.get('middle_name'), 50) or None
        student.last_name = _short(data.get('last_name'), 50) or None
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
    def verify_reset_code(self, request):
        """Checks a password-reset code before the student types a new password (the code stays valid for
        reset_password). A wrong code counts toward the same 5-try limit."""
        from .models import OTPVerification
        email = str(request.data.get('email', '')).strip().lower()
        otp_input = str(request.data.get('otp', '')).strip()
        if not email or not otp_input:
            return Response({"error": "Enter the 6-digit code."}, status=status.HTTP_400_BAD_REQUEST)
        verification = OTPVerification.objects.filter(email=email).first()
        if not verification:
            return Response({"error": "Invalid or expired reset code."}, status=status.HTTP_400_BAD_REQUEST)
        if verification.attempts >= 5:
            verification.delete()
            return Response({"error": "Too many wrong codes. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
        if (utc_now() - verification.created_at).total_seconds() > 300:
            verification.delete()
            return Response({"error": "Reset code has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
        if verification.otp != otp_input:
            verification.attempts += 1
            verification.save()
            return Response({"error": "Invalid or expired reset code."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"valid": True})

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
        # Same minimum as registration; checked before the code so a short password doesn't use up a try
        if len(new_password) < 8:
            return Response({"error": "Your new password needs at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)

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
                if new_name != student.name:
                    student.first_name = student.middle_name = student.last_name = None
                student.name = new_name

            # 2. Validate Student ID Uniqueness if changing
            new_student_id = data.get('student_id', '').strip()
            if new_student_id and new_student_id != student.student_id:
                id_error = student_id_error(new_student_id)
                if id_error:
                    return Response({"error": id_error}, status=status.HTTP_400_BAD_REQUEST)
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

# OSA Student Handbook, Section 3 (Non-Academic Light Offenses): 3 hours of community service for the first
# offense, 6 hours for the second, and no entry into the campus from the third on. Admins don't choose the hours:
# approving a report applies this table (a no-entry sanction has no hours to serve).
NO_ENTRY = {"punishment": "No Entry into the Campus", "hours": 0}
LIGHT_OFFENSE = {
    1: {"punishment": "3 hours community service", "hours": 3},
    2: {"punishment": "6 hours community service", "hours": 6},
    3: NO_ENTRY,
}

# DEMO: No ID is 1 minute on a first offense for the demo (normally LIGHT_OFFENSE: 3 hours)
DEMO_NO_ID_OFFENSE = {
    1: {"punishment": "1 minute community service", "hours": 1 / 60},
    2: LIGHT_OFFENSE[2],
    3: LIGHT_OFFENSE[3],
}

PUNISHMENT_SYSTEM = {
    # The violations guards and faculty & staff report (their report forms list exactly these)
    "Curfew Violation": LIGHT_OFFENSE,
    "No ID / Improper ID Sling": DEMO_NO_ID_OFFENSE,  # DEMO (normally LIGHT_OFFENSE)
    "No School Uniform": LIGHT_OFFENSE,
    "Dress Code Violation": LIGHT_OFFENSE,
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


def _report_details_error(data):
    """(student_id, violation_types, None) from a report form, or (None, None, error Response)."""
    student_id = str(data.get('student_id') or data.get('studentId') or '').strip()  # studentId: old field name
    if not student_id:
        return None, None, Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    id_error = student_id_error(student_id)
    if id_error:
        return None, None, Response({"error": id_error}, status=status.HTTP_400_BAD_REQUEST)

    # The violations: several at once (violation_types, the report forms since 2026-09-30) or one
    # (violation_type / violation, older app versions). Each becomes its own report, with its own
    # offense count and penalty, the same as reporting them one after the other.
    raw_types = data.get('violation_types')
    if not isinstance(raw_types, list):
        raw_types = [data.get('violation_type') or data.get('violation')]
    violation_types = []
    for value in raw_types:
        value = _short(value, 150)
        if value and value not in violation_types:
            violation_types.append(value)
    if not violation_types:
        return None, None, Response({"error": "Choose at least one violation."}, status=status.HTTP_400_BAD_REQUEST)
    if len(violation_types) > 10:
        return None, None, Response({"error": "Choose at most 10 violations in one report."}, status=status.HTTP_400_BAD_REQUEST)
    return student_id, violation_types, None


def file_violation_reports(data, reporter, reporting_account=None, **reporter_fields):
    """Files one report per violation from a report form (guards, faculty & staff, admins): (reports, None),
    or (None, error Response). reporter_fields: the faculty email fields of faculty_report."""
    student_id, violation_types, error = _report_details_error(data)
    if error:
        return None, error

    # 1. The report goes to the student with this ID, and only by ID: names can repeat, and
    # matching by name used to attach reports to the wrong person
    student = Student.objects.filter(student_id=student_id).first()
    if not student:
        # Not registered yet: keep the report under the ID with the details the reporter entered.
        # This record can't log in; when the student registers with this ID it becomes their
        # account and keeps this report (StudentViewSet.register_with_otp).
        student = Student(
            student_id=student_id,
            name=_short(data.get('name'), 100) or UNREGISTERED_NAME,
            first_name=_short(data.get('first_name'), 50) or None,
            middle_name=_short(data.get('middle_initial'), 2).rstrip('.') or None,
            last_name=_short(data.get('last_name'), 50) or None,
            course=_short(data.get('course'), 100) or 'Unknown',
            department=_short(data.get('department'), 100) or 'Unknown',
            contact_number=_short(data.get('contact'), 20),
            email=_short(data.get('email'), 254).lower(),
            gender=_gender(data.get('gender')),
        ).save()
    elif not student.gender and _gender(data.get('gender')):
        # The reporter saw the student: fills in the gender for records that don't have it yet
        student.gender = _gender(data.get('gender'))
        student.save()

    # 2. One report per violation, each waiting for OSA's review, with its own offense count and penalty
    description = _short(data.get('description'), MAX_DESCRIPTION_CHARS)
    reports = []
    try:
        for violation_type in violation_types:
            offense_count = get_offense_count(student, violation_type)
            punishment_info = get_punishment(violation_type, offense_count)
            report = ViolationReport(
                student=student,
                violation_type=violation_type,
                description=description,
                reporting_guard=reporter,
                reporting_account=reporting_account,
                status="Pending OSA Review",
                offense_count=offense_count,
                punishment=punishment_info["punishment"],
                created_at=utc_now(),
                **reporter_fields,
            ).save()
            send_violation_email(report)
            reports.append(report)
    except Exception as e:
        print(f"Violation report failed: {e}")
        return None, Response({"error": str(e), "saved": len(reports)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return reports, None


def _report_summaries(reports):
    return [{"id": str(r.id), "violation_type": r.violation_type, "offense_count": r.offense_count, "punishment": r.punishment}
            for r in reports]


# Faculty don't have accounts: the report page for faculty (/faculty/report) is open, and a faculty member
# confirms their USTP email with a code before the report can be sent. The report carries that email and the
# name read from it (vincent.dagaraga@ustp.edu.ph -> Vincent Dagaraga), and OSA checks it against their own
# faculty records when reviewing it in Pending Reviews.
FACULTY_EMAIL_RE = re.compile(r'^[a-z0-9._%+-]+@ustp\.edu\.ph$')
FACULTY_CODE_KEY = 'faculty:'  # the codes share otp_verifications with the students' (one per email)
FACULTY_CODE_WAIT_S = 60
FACULTY_SALT = 'osaconnect-faculty-email'
FACULTY_VERIFIED_S = 2 * 3600  # long enough to finish the report; the page asks again after that


def name_from_ustp_email(email):
    """(first name, last name) read from a USTP address: 'vincent.dagaraga1@ustp.edu.ph' -> ('Vincent', 'Dagaraga').
    The first part is the first name and the rest the last name ('juan.dela.cruz' -> 'Juan', 'Dela Cruz')."""
    local = email.split('@')[0]
    parts = [re.sub(r'[^a-z]', '', p) for p in re.split(r'[._+-]+', local.lower())]
    parts = [p for p in parts if p]
    if not parts:
        return '', ''
    return parts[0].title(), ' '.join(parts[1:]).title()


def _faculty_email(data):
    """A USTP address from the form, or one of the test addresses in FACULTY_TEST_EMAILS (backend/.env), else None."""
    email = _short(data.get('faculty_email'), 254).lower()
    return email if FACULTY_EMAIL_RE.match(email) or email in settings.FACULTY_TEST_EMAILS else None


@api_view(['POST'])
@permission_classes([AllowAny])
def faculty_verify_request(request):
    """Faculty report page, "Confirm email address": emails a 6-digit code. POST {faculty_email}"""
    from .models import OTPVerification
    email = _faculty_email(request.data)
    if not email:
        return Response({"error": "Use your USTP email, ending in @ustp.edu.ph."}, status=status.HTTP_400_BAD_REQUEST)
    # An email that already has a faculty account reports from the account (log in at /faculty)
    if _faculty_account(email):
        return Response({"error": "This email already has a faculty account. Log in to report.", "has_account": True},
                        status=status.HTTP_400_BAD_REQUEST)
    key = FACULTY_CODE_KEY + email
    previous = OTPVerification.objects(email=key).first()
    if previous and (utc_now() - previous.created_at).total_seconds() < FACULTY_CODE_WAIT_S:
        return Response({"error": "A code was just sent. Wait a minute before asking for another."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    OTPVerification.objects(email=key).delete()
    code = f'{secrets.randbelow(900000) + 100000}'
    verification = OTPVerification(email=key, otp=code).save()
    if settings.DEBUG:
        # Local testing without a USTP inbox: the code is also shown in the backend's console (never in production)
        print(f"[DEV] Faculty email code for {email}: {code}", flush=True)
    try:
        send_code_email(email, code, 'faculty', name=name_from_ustp_email(email)[0])
    except Exception as e:
        verification.delete()
        error = f"Failed to send email: {e}" if settings.DEBUG else "Couldn't send the email. Check the address and try again."
        return Response({"error": error}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response({"message": f"Code sent to {email}."})


@api_view(['POST'])
@permission_classes([AllowAny])
def faculty_verify_confirm(request):
    """Checks the code: answers with a token the report is sent with. POST {faculty_email, otp}"""
    from .models import OTPVerification
    email = _faculty_email(request.data)
    verification = OTPVerification.objects(email=FACULTY_CODE_KEY + email).first() if email else None
    if not verification:
        return Response({"error": "No code was sent to this email, or it expired. Ask for a new one."}, status=status.HTTP_400_BAD_REQUEST)
    if (utc_now() - verification.created_at).total_seconds() > 300:
        verification.delete()
        return Response({"error": "The code expired. Ask for a new one."}, status=status.HTTP_400_BAD_REQUEST)
    if verification.attempts >= 5:
        verification.delete()
        return Response({"error": "Too many wrong codes. Ask for a new one."}, status=status.HTTP_400_BAD_REQUEST)
    if verification.otp != _short(request.data.get('otp'), 10):
        verification.attempts += 1
        verification.save()
        return Response({"error": "That code isn't right."}, status=status.HTTP_400_BAD_REQUEST)
    verification.delete()
    first, last = name_from_ustp_email(email)
    return Response({
        "token": signing.dumps({'e': email}, salt=FACULTY_SALT, compress=True),
        "email": email, "first_name": first, "last_name": last, "expires_in": FACULTY_VERIFIED_S,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def faculty_report(request):
    """Files a faculty member's report, with the token from faculty_verify_confirm. POST {token, ...report form}.
    The email goes on OSA's list to confirm (FacultyInvite) unless it already has an account."""
    try:
        email = signing.loads(str(request.data.get('token') or ''), salt=FACULTY_SALT, max_age=FACULTY_VERIFIED_S)['e']
    except (signing.BadSignature, KeyError, TypeError):
        return Response({"error": "Confirm your email address again before sending the report.", "needs_verification": True},
                        status=status.HTTP_403_FORBIDDEN)
    first, last = name_from_ustp_email(email)
    reporter = ' '.join(p for p in (first, last) if p) or email
    reports, error = file_violation_reports(request.data, reporter, reporting_email=email,
                                            reporter_first_name=first, reporter_last_name=last)
    if error:
        return error
    if not _faculty_account(email):
        FacultyInvite.objects(email=email).update_one(
            upsert=True, set_on_insert__first_name=first, set_on_insert__last_name=last,
            set_on_insert__status='unconfirmed', set_on_insert__first_report_at=utc_now())
    return Response({"reports": _report_summaries(reports), "reported_by": reporter, "email": email},
                    status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def faculty_student_lookup(request, student_id):
    """The faculty report page (no account) looks up a scanned or typed student, like a guard's form does, and
    fills in everything the student's record has (OSA's choice: the contact number and email too, before the
    faculty member's email is confirmed). Anyone with the page's link can use it."""
    student = Student.objects(student_id=str(student_id).strip()).first()
    if not student:
        return Response({"error": "No student with that ID."}, status=status.HTTP_404_NOT_FOUND)
    data = StudentSerializer(student).data
    data.pop('qr_data', None)
    return Response(data)


# Faculty accounts. Two ways in:
#  - "Create an account" (/faculty/signup): all details + a code; the account can't log in until OSA confirms
#    it in Admin > Faculty Accounts (faculty_status 'pending' -> 'verified'; an email tells them).
#  - Reported without an account: OSA confirms the email (FacultyInvite), which emails a link to
#    /faculty/signup?invite=...; the email is filled in, they add their details and one last code, and the
#    account is active at once.
# Once active they log in with email and password, no code.
FACULTY_SIGNUP_KEY = 'faculty-signup:'  # its own codes, apart from the report page's
MIN_PASSWORD_CHARS = 8
FACULTY_INVITE_SALT = 'osaconnect-faculty-invite'
FACULTY_INVITE_MAX_AGE_S = 14 * 24 * 3600
REJECTED_REPORTER_REASON = 'The reporter was not confirmed as USTP faculty.'


def _dismiss_rejected_reporter_reports(email):
    """OSA rejected this faculty member: their reports still waiting for review are dismissed (to the Archives)."""
    return ViolationReport.objects(reporting_email=email.lower(), status='Pending OSA Review').update(
        set__status='Dismissed', set__dismissed_at=utc_now(), set__dismissed_reason=REJECTED_REPORTER_REASON)


PENDING_FACULTY_LOGIN = "Your account is waiting for OSA to confirm you're USTP faculty. You'll get an email when it's active."
REJECTED_FACULTY_LOGIN = "OSA couldn't confirm this account as USTP faculty. Contact the Office of Student Affairs."


def _faculty_account(email):
    return SystemUser.objects(Q(username__iexact=email) | Q(email__iexact=email)).first()


def _invite_email(token):
    """The email of a valid, unused invite link, else None."""
    try:
        email = signing.loads(str(token or ''), salt=FACULTY_INVITE_SALT, max_age=FACULTY_INVITE_MAX_AGE_S)['e']
    except (signing.BadSignature, KeyError, TypeError):
        return None
    invite = FacultyInvite.objects(email=email, status='invited').first()
    return email if invite else None


def _faculty_signup_details(data):
    """(first, last, email, invited, None) from the sign-up form, or (.., error message). With an invite link
    the email comes from the link."""
    first = format_person_name(_short(data.get('first_name'), 50))
    last = format_person_name(_short(data.get('last_name'), 50))
    invited = bool(data.get('invite'))
    email = _invite_email(data.get('invite')) if invited else _faculty_email(data)
    if invited and not email:
        return first, last, None, True, "This link expired or was already used. Sign up from the faculty login page."
    if not first or not last:
        return first, last, email, invited, "Type your first name and last name."
    if not email:
        return first, last, email, invited, "Use your USTP email, ending in @ustp.edu.ph."
    if _faculty_account(email):
        return first, last, email, invited, "This email already has an account. Log in instead."
    return first, last, email, invited, None


@api_view(['GET'])
@permission_classes([AllowAny])
def faculty_invite(request):
    """The sign-up page opened from an invite email: the email it's for. GET ?token="""
    email = _invite_email(request.query_params.get('token'))
    if not email:
        return Response({"error": "This link expired or was already used. You can still sign up below."}, status=status.HTTP_400_BAD_REQUEST)
    invite = FacultyInvite.objects(email=email).first()
    return Response({"email": email, "first_name": invite.first_name, "last_name": invite.last_name})


@api_view(['POST'])
@permission_classes([AllowAny])
def faculty_signup_request(request):
    """Faculty sign-up, step 1: emails a 6-digit code. POST {first_name, last_name, faculty_email | invite}"""
    from .models import OTPVerification
    first, last, email, _, error = _faculty_signup_details(request.data)
    if error:
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
    key = FACULTY_SIGNUP_KEY + email
    previous = OTPVerification.objects(email=key).first()
    if previous and (utc_now() - previous.created_at).total_seconds() < FACULTY_CODE_WAIT_S:
        return Response({"error": "A code was just sent. Wait a minute before asking for another."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    OTPVerification.objects(email=key).delete()
    code = f'{secrets.randbelow(900000) + 100000}'
    verification = OTPVerification(email=key, otp=code).save()
    if settings.DEBUG:
        print(f"[DEV] Faculty sign-up code for {email}: {code}", flush=True)
    try:
        send_code_email(email, code, 'faculty_signup', name=first)
    except Exception as e:
        verification.delete()
        error = f"Failed to send email: {e}" if settings.DEBUG else "Couldn't send the email. Check the address and try again."
        return Response({"error": error}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response({"message": f"Code sent to {email}.", "email": email})


@api_view(['POST'])
@permission_classes([AllowAny])
def faculty_signup(request):
    """Faculty sign-up, step 2: checks the code and makes the account. POST {first_name, last_name,
    faculty_email | invite, password, otp}. An email OSA already confirmed (invite link, or one it confirmed
    from a report) is active and logged in at once; otherwise the account waits for OSA ("pending")."""
    from .models import OTPVerification
    first, last, email, _, error = _faculty_signup_details(request.data)
    password = str(request.data.get('password') or '')
    if not error and len(password) < MIN_PASSWORD_CHARS:
        error = f"Your password needs at least {MIN_PASSWORD_CHARS} characters."
    if error:  # checked before the code, so a fixable mistake doesn't use it up
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
    verification = OTPVerification.objects(email=FACULTY_SIGNUP_KEY + email).first()
    if not verification:
        return Response({"error": "No code was sent to this email, or it expired. Ask for a new one."}, status=status.HTTP_400_BAD_REQUEST)
    if (utc_now() - verification.created_at).total_seconds() > 300:
        verification.delete()
        return Response({"error": "The code expired. Ask for a new one."}, status=status.HTTP_400_BAD_REQUEST)
    if verification.attempts >= 5:
        verification.delete()
        return Response({"error": "Too many wrong codes. Ask for a new one."}, status=status.HTTP_400_BAD_REQUEST)
    if verification.otp != _short(request.data.get('otp'), 10):
        verification.attempts += 1
        verification.save()
        return Response({"error": "That code isn't right."}, status=status.HTTP_400_BAD_REQUEST)
    verification.delete()

    confirmed = FacultyInvite.objects(email=email, status='invited').first() is not None
    try:
        user = SystemUser(
            username=email, email=email, first_name=first, last_name=last, full_name=f'{first} {last}',
            role='staff', bio='USTP Faculty & Staff', password=hash_password(password), registered_at=utc_now(),
            is_active=confirmed, faculty_status='verified' if confirmed else 'pending',
        ).save()
    except NotUniqueError:
        return Response({"error": "This email already has an account. Log in instead."}, status=status.HTTP_400_BAD_REQUEST)
    # Reports filed with this email before the account existed carry the name read from the email: use the real one
    ViolationReport.objects(reporting_email=email).update(
        set__reporting_guard=user.full_name, set__reporter_first_name=first, set__reporter_last_name=last)
    if not confirmed:
        return Response({"active": False, "email": email, "message": PENDING_FACULTY_LOGIN}, status=status.HTTP_201_CREATED)
    FacultyInvite.objects(email=email).update_one(set__status='registered')
    return Response({
        "active": True,
        "success": True,
        "token": issue_token(user.role, user.username, user.password),
        "role": user.role,
        "username": user.username,
        "full_name": user.full_name,
        "bio": user.bio,
    }, status=status.HTTP_201_CREATED)


FACULTY_RESET_KEY = 'faculty-reset:'


def _faculty_reset_account(email):
    """The faculty account a USTP email resets (a sign-up that isn't rejected), else None."""
    user = _faculty_account(email) if email else None
    return user if user and user.role == 'staff' and user.faculty_status != 'rejected' else None


@api_view(['POST'])
@permission_classes([AllowAny])
def faculty_reset_request(request):
    """Faculty "Forgot password?", step 1: emails a code to the account's USTP email. POST {faculty_email}
    (Guard accounts are shared and have no email: OSA resets them with create_account.)"""
    from .models import OTPVerification
    email = _faculty_email(request.data)
    if not email:
        return Response({"error": "Use your USTP email, ending in @ustp.edu.ph."}, status=status.HTTP_400_BAD_REQUEST)
    user = _faculty_reset_account(email)
    if not user:
        return Response({"error": "No faculty account uses this email. Guards: ask OSA to reset your password."},
                        status=status.HTTP_404_NOT_FOUND)
    key = FACULTY_RESET_KEY + email
    previous = OTPVerification.objects(email=key).first()
    if previous and (utc_now() - previous.created_at).total_seconds() < FACULTY_CODE_WAIT_S:
        return Response({"error": "A code was just sent. Wait a minute before asking for another."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    OTPVerification.objects(email=key).delete()
    code = f'{secrets.randbelow(900000) + 100000}'
    verification = OTPVerification(email=key, otp=code).save()
    if settings.DEBUG:
        print(f"[DEV] Faculty password reset code for {email}: {code}", flush=True)
    try:
        send_code_email(email, code, 'reset', name=user.first_name or user.full_name)
    except Exception as e:
        verification.delete()
        error = f"Failed to send email: {e}" if settings.DEBUG else "Couldn't send the email. Check the address and try again."
        return Response({"error": error}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response({"message": f"Code sent to {email}."})


@api_view(['POST'])
@permission_classes([AllowAny])
def faculty_reset_password(request):
    """Faculty "Forgot password?", step 2: the code and a new password. POST {faculty_email, otp, password}"""
    from .models import OTPVerification
    email = _faculty_email(request.data)
    user = _faculty_reset_account(email)
    password = str(request.data.get('password') or '')
    if not user:
        return Response({"error": "No faculty account uses this email."}, status=status.HTTP_404_NOT_FOUND)
    if len(password) < MIN_PASSWORD_CHARS:  # before the code, so a fixable mistake doesn't use it up
        return Response({"error": f"Your new password needs at least {MIN_PASSWORD_CHARS} characters."}, status=status.HTTP_400_BAD_REQUEST)
    verification = OTPVerification.objects(email=FACULTY_RESET_KEY + email).first()
    if not verification:
        return Response({"error": "No code was sent to this email, or it expired. Ask for a new one."}, status=status.HTTP_400_BAD_REQUEST)
    if (utc_now() - verification.created_at).total_seconds() > 300:
        verification.delete()
        return Response({"error": "The code expired. Ask for a new one."}, status=status.HTTP_400_BAD_REQUEST)
    if verification.attempts >= 5:
        verification.delete()
        return Response({"error": "Too many wrong codes. Ask for a new one."}, status=status.HTTP_400_BAD_REQUEST)
    if verification.otp != _short(request.data.get('otp'), 10):
        verification.attempts += 1
        verification.save()
        return Response({"error": "That code isn't right."}, status=status.HTTP_400_BAD_REQUEST)
    verification.delete()
    user.password = hash_password(password)
    user.save()
    forget_account(user.username)  # logins made with the old password stop working
    message = "Password changed. You can log in now." if user.is_active else PENDING_FACULTY_LOGIN
    return Response({"message": message, "active": bool(user.is_active)})


def _report_counts(emails):
    """Reports filed under each email, as an account or without one."""
    counts = {}
    for row in ViolationReport.objects(Q(reporting_email__in=emails) | Q(reporting_account__in=emails)).only('reporting_email', 'reporting_account'):
        key = (row.reporting_email or row.reporting_account or '').lower()
        counts[key] = counts.get(key, 0) + 1
    return counts


@api_view(['GET'])
@permission_classes([IsAdmin])
def faculty_accounts(request):
    """Admin > Faculty Accounts: sign-ups waiting for OSA, and emails faculty reported with (no account yet)."""
    accounts = list(SystemUser.objects(role='staff', faculty_status__ne=None))
    invites = list(FacultyInvite.objects(status__ne='registered'))
    counts = _report_counts([u.username for u in accounts] + [i.email for i in invites])
    order = {'pending': 0, 'unconfirmed': 0, 'invited': 1, 'verified': 1, 'rejected': 2}
    when = lambda d: -(d or datetime.datetime.min).timestamp()  # noqa: E731
    accounts.sort(key=lambda u: (order.get(u.faculty_status, 3), when(u.registered_at)))
    invites.sort(key=lambda i: (order.get(i.status, 3), when(i.first_report_at)))
    return Response({
        "accounts": [{
            "username": u.username, "email": u.email or u.username, "first_name": u.first_name, "last_name": u.last_name,
            "status": u.faculty_status, "registered_at": _aware_iso(u.registered_at), "reports": counts.get(u.username.lower(), 0),
        } for u in accounts],
        "emails": [{
            "email": i.email, "first_name": i.first_name, "last_name": i.last_name, "status": i.status,
            "first_report_at": _aware_iso(i.first_report_at), "reports": counts.get(i.email, 0),
        } for i in invites],
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def faculty_account_decision(request, username):
    """A sign-up waiting for OSA: 'verify' activates it (and emails them), 'reject' keeps it from logging in."""
    decision = request.data.get('decision')
    if decision not in ('verify', 'reject'):
        return Response({"error": "decision must be 'verify' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)
    user = SystemUser.objects(username=username, role='staff', faculty_status__ne=None).first()
    if not user:
        return Response({"error": "No faculty account with that email."}, status=status.HTTP_404_NOT_FOUND)
    user.faculty_status = 'verified' if decision == 'verify' else 'rejected'
    user.is_active = decision == 'verify'
    user.save()
    dismissed = 0
    if decision == 'reject':
        forget_account(user.username)
        dismissed = _dismiss_rejected_reporter_reports(user.email or user.username)
    emailed = False
    if decision == 'verify':
        try:
            send_faculty_activated(user.email or user.username, user.first_name, app_url('/faculty'))
            emailed = True
        except Exception as e:
            print(f"Activation email failed: {e}")
    return Response({"status": user.faculty_status, "emailed": emailed, "dismissed": dismissed})


@api_view(['POST'])
@permission_classes([IsAdmin])
def faculty_email_decision(request):
    """An email faculty reported with: 'confirm' (real USTP faculty) emails them the link to finish an account;
    'reject' doesn't. POST {email, decision}"""
    decision = request.data.get('decision')
    if decision not in ('confirm', 'reject'):
        return Response({"error": "decision must be 'confirm' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)
    invite = FacultyInvite.objects(email=_short(request.data.get('email'), 254).lower()).first()
    if not invite or invite.status == 'registered':
        return Response({"error": "No email waiting with that address."}, status=status.HTTP_404_NOT_FOUND)
    invite.status = 'invited' if decision == 'confirm' else 'rejected'
    invite.decided_at = utc_now()
    invite.decided_by = request.user.name or request.user.username
    invite.save()
    dismissed = _dismiss_rejected_reporter_reports(invite.email) if decision == 'reject' else 0
    emailed = False
    if decision == 'confirm':
        token = signing.dumps({'e': invite.email}, salt=FACULTY_INVITE_SALT, compress=True)
        link = app_url(f'/faculty/signup?invite={urllib.parse.quote(token)}')
        if settings.DEBUG:
            print(f"[DEV] Faculty invite link for {invite.email}: {link}", flush=True)
        try:
            send_faculty_invite(invite.email, invite.first_name, link)
            emailed = True
        except Exception as e:
            print(f"Invite email failed: {e}")
    return Response({"status": invite.status, "emailed": emailed, "dismissed": dismissed})


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_alerts(request):
    """Counts for the admin sidebar's badges, on every admin page."""
    return Response({
        "pending_reports": ViolationReport.objects(status='Pending OSA Review').count(),
        "pending_faculty": SystemUser.objects(role='staff', faculty_status='pending').count()
                           + FacultyInvite.objects(status='unconfirmed').count(),
    })

# The guards' Reports page: reports from the last FEED_DAYS days
FEED_DAYS = 30
FEED_MAX = 1000


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
        if self.action in ('summary', 'monthly_report', 'feed'):
            return [IsReporter()]  # counts for the guards' analytics; the student rows are admin-only
        return [IsAdmin()]  # approve, dismiss, reassign, clearance, bulk reports, analytics, edits

    def get_queryset(self):
        role = role_of(self.request)
        if self.action == 'list' and role == 'student':
            # A student only ever gets their own violations
            me = Student.objects(student_id=self.request.user.username).first()
            return ViolationReport.objects(student=me).select_related() if me else ViolationReport.objects.none()
        if self.action == 'list' and role in ('guard', 'staff'):
            # Guards and faculty & staff see the reports their account filed: by reporting_account, and older
            # reports (before it was kept) by the account's name, which they were saved under
            names = [n for n in (self.request.user.name, self.request.user.username) if n]
            mine = Q(reporting_account=self.request.user.username) | Q(reporting_account=None, reporting_guard__in=names)
            if role == 'staff':
                # A faculty account made with a USTP email also has the reports filed with that email before it
                # existed (faculty_report, no account)
                account = SystemUser.objects(username=self.request.user.username).only('email').first()
                email = ((account.email if account else None) or (self.request.user.username if '@' in self.request.user.username else '')).lower()
                if email:
                    mine = mine | Q(reporting_email=email)
            return ViolationReport.objects(mine).select_related()
        # select_related loads the students in one query instead of one per violation
        student = _student_filter(self.request)
        if student is False:
            qs = ViolationReport.objects.all()
        else:
            qs = ViolationReport.objects(student=student) if student else ViolationReport.objects.none()
        if self.action == 'list':
            qs = _scoped_violations(qs, self.request.query_params.get('scope'))
            year = self.request.query_params.get('year')
            if year and year.isdigit():
                # One Philippine calendar year (Analytics loads only the year it reports on)
                ph = datetime.timezone(datetime.timedelta(hours=8))
                start = datetime.datetime(int(year), 1, 1, tzinfo=ph).astimezone(datetime.timezone.utc).replace(tzinfo=None)
                end = datetime.datetime(int(year) + 1, 1, 1, tzinfo=ph).astimezone(datetime.timezone.utc).replace(tzinfo=None)
                qs = qs.filter(created_at__gte=start, created_at__lt=end)
        # select_related returns a plain list, which single-record routes (/violations/<id>/) can't use
        return qs.select_related() if self.action == 'list' and student is not None else qs


    @action(detail=False, methods=['get'])
    def feed(self, request):
        """The guards' Reports page: every report guards and faculty & staff filed in the last FEED_DAYS days,
        newest first. A caught student claims their ID back from the guard, who checks here that the student
        was really reported. Only what that check needs: no contact details, emails or descriptions."""
        if role_of(request) not in ('guard', 'admin'):
            return Response({"error": "Only guards can see every report."}, status=status.HTTP_403_FORBIDDEN)
        roles = {u.username: u.role for u in SystemUser.objects.only('username', 'role')}
        since = utc_now() - datetime.timedelta(days=FEED_DAYS)
        reports = ViolationReport.objects(created_at__gte=since).order_by('-created_at').limit(FEED_MAX).select_related()
        rows = []
        for r in reports:
            # Faculty file with a confirmed USTP email (faculty_report); older reports with no account came from guards
            reporter_role = 'staff' if r.reporting_email else roles.get(r.reporting_account, 'guard')
            if reporter_role == 'admin':
                continue  # OSA's own reports (event no-shows) don't involve a confiscated ID
            student = r.student if isinstance(r.student, Student) else None
            rows.append({
                "id": str(r.id),
                "student_name": display_student_name(student) if student else 'Unknown student',
                "student_id": student.student_id if student else '',
                "violation_type": r.violation_type,
                "status": r.status,
                "created_at": _aware_iso(r.created_at),
                "reported_by": r.reporting_guard or 'Campus personnel',
                "reporter_role": 'staff' if reporter_role == 'staff' else 'guard',
            })
        return Response({"days": FEED_DAYS, "reports": rows})

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
        """The admin's "Report Violation" (Students page): one violation for one or more students, approved
        right away at the chosen building. POST {students: [{student_id, name}], violation_type, description,
        assigned_building, custom_hours}. Reports are saved under the student ID: an ID with no account gets
        a placeholder record (with the name the admin typed, if any), which becomes the student's account when
        they register (register_with_otp), so these violations show up there. Older pages send student_ids
        and no hours (then the penalty table decides)."""
        data = request.data
        # The building dropdown lists service sites (their site code); older clients send a name
        assigned_site = _resolve_service_site(data.get('assigned_building'))
        assigned_building = assigned_site.name if assigned_site else _short(data.get('assigned_building'), 150)
        violation_type = _short(data.get('violation_type'), 150) or "Failure to attend mandatory campus event"
        description = _short(data.get('description'), MAX_DESCRIPTION_CHARS)
        reporter = request.user.name or request.user.username

        # One entry per ID, first one wins (the page removes duplicates too)
        entries = data.get('students')
        if entries is None:
            entries = [{'student_id': sid} for sid in (data.get('student_ids') or [])]
        students_in, seen = [], set()
        for entry in entries if isinstance(entries, list) else []:
            entry = entry if isinstance(entry, dict) else {'student_id': entry}
            sid = str(entry.get('student_id') or '').strip()
            if sid and sid not in seen:
                seen.add(sid)
                students_in.append((sid, _short(entry.get('name'), 100)))

        if not students_in:
            return Response({"error": "Add at least one student."}, status=status.HTTP_400_BAD_REQUEST)
        if len(students_in) > 500:
            return Response({"error": "Report at most 500 students at a time."}, status=status.HTTP_400_BAD_REQUEST)
        if not assigned_building:
            return Response({"error": "Choose the building for their community service."}, status=status.HTTP_400_BAD_REQUEST)
        custom_hours = data.get('custom_hours')
        if custom_hours is not None and str(custom_hours).strip() != '':
            try:
                custom_hours = float(custom_hours)
            except (TypeError, ValueError):
                custom_hours = -1
            if not 0 <= custom_hours <= 100:
                return Response({"error": "Required hours must be between 0 and 100."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            custom_hours = None

        # Every ID is checked before anything is saved, so a typo doesn't leave half the list reported
        problems = [{"student_id": sid, "error": student_id_error(sid)} for sid, _ in students_in if student_id_error(sid)]
        if problems:
            return Response({"error": "Fix these students first.", "results": problems}, status=status.HTTP_400_BAD_REQUEST)

        full = _over_capacity(assigned_site, len(students_in), request)
        if full:
            return full

        results = []
        for sid, name in students_in:
            try:
                student = Student.objects(student_id=sid).first()
                if not student:
                    # No account yet: a placeholder under the ID (no password, so nobody can log in with it).
                    # The name is optional; registering replaces it with the student's own.
                    student = Student(student_id=sid, name=name or UNREGISTERED_NAME, course='Unknown', department='Unknown').save()
                elif name and not student.password and name != student.name:
                    # Still a placeholder (e.g. from a guard's report): the admin's spelling of the name wins
                    student.name = name
                    student.save()

                offense_count = get_offense_count(student, violation_type)
                if custom_hours is not None:
                    hours = custom_hours
                    punishment = (f"{hours:g} hour{'' if hours == 1 else 's'} community service" if hours > 0
                                  else "No community service")
                else:
                    punishment_info = get_punishment(violation_type, offense_count)
                    hours, punishment = punishment_info["hours"], punishment_info["punishment"]

                report = ViolationReport(
                    student=student,
                    violation_type=violation_type,
                    description=description,
                    reporting_guard=reporter,
                    reporting_account=request.user.username,
                    # No hours to serve: nothing to do, so it goes straight to the archives (same as approve)
                    status="Approved" if hours > 0 else "Completed",
                    assigned_building=assigned_building,
                    building_history=[_building_entry(assigned_building, request)],
                    offense_count=offense_count,
                    punishment=punishment,
                    created_at=utc_now()
                ).save()
                if hours > 0:
                    ETicket(
                        violation=report,
                        assigned_location=assigned_building,
                        total_hours_required=hours,
                        remaining_hours=hours,
                        status="Active",
                        **_site_ticket_fields(assigned_site)
                    ).save()
                send_violation_email(report)  # skipped when the student has no email yet
                results.append({"student_id": sid, "name": student.name, "status": "success", "has_account": bool(student.password)})
            except Exception as e:
                results.append({"student_id": sid, "status": "failed", "error": str(e)})

        done = sum(1 for r in results if r['status'] == 'success')
        return Response({
            "message": f"{done} student{'' if done == 1 else 's'} reported." + (f" {len(results) - done} failed." if done < len(results) else ''),
            "results": results
        }, status=status.HTTP_201_CREATED)

    def create(self, request, *args, **kwargs):
        # Reported by: guards share accounts, so a guard account names the guard on duty (on_duty_name, typed on
        # the report form; older app versions don't send it and keep the account's name). Faculty & staff
        # accounts report as themselves; only admins may name someone else. (Faculty without an account file
        # through faculty_report, with a confirmed USTP email.)
        data = request.data
        role = role_of(request)
        if role == 'admin':
            reporter = data.get('reporting_guard') or 'OSA Administrator'
        elif role == 'guard':
            reporter = format_person_name(_short(data.get('on_duty_name'), 100)) or request.user.name or request.user.username
        else:
            reporter = request.user.name or request.user.username
        # A faculty account made through faculty_signup: its email and name go on the report, for OSA to check
        # against its faculty records (the same as a report filed without an account)
        reporter_fields = {}
        if role == 'staff':
            account = SystemUser.objects(username=request.user.username).only('email', 'first_name', 'last_name').first()
            if account and account.email:
                reporter_fields = {'reporting_email': account.email, 'reporter_first_name': account.first_name,
                                   'reporter_last_name': account.last_name}
        reports, error = file_violation_reports(data, reporter, reporting_account=request.user.username, **reporter_fields)
        if error:
            return error
        # The first report as before (older app versions read it), plus all of them
        response_data = self.get_serializer(reports[0]).data
        response_data["notification_type"] = "action_required"
        response_data["reports"] = _report_summaries(reports)
        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, *args, **kwargs):
        """Approves a pending report with the OSA handbook penalty for its offense number (PUNISHMENT_SYSTEM);
        the admin only picks the building. Hours to serve: an e-ticket at that building. No hours (no entry into
        the campus): the sanction is recorded and the case goes straight to the archives, no building needed."""
        try:
            violation_id = kwargs.get('id') or kwargs.get('pk')
            violation = ViolationReport.objects.get(id=violation_id)

            if violation.status != "Pending OSA Review":
                return Response({"error": "This violation was already reviewed by someone else."}, status=status.HTTP_409_CONFLICT)
            # Filed by a faculty member OSA hasn't confirmed: confirm them in Faculty Accounts first (rejecting
            # them dismisses the report)
            if faculty_reporter_status(violation.reporting_email):
                return Response({"error": "The faculty member who filed this isn't confirmed yet. Confirm them in Faculty Accounts first.",
                                 "reporter_status": faculty_reporter_status(violation.reporting_email)}, status=status.HTTP_409_CONFLICT)

            punishment_info = get_punishment(violation.violation_type, violation.offense_count)
            hours, punishment = punishment_info["hours"], punishment_info["punishment"]

            assigned_building = assigned_site = None
            if hours > 0:
                # Community service needs a building: the dropdown lists service sites (their site code);
                # older clients send a name
                assigned_building = request.data.get('assigned_building')
                if not assigned_building:
                    return Response({"error": "Please assign a building before approval"}, status=status.HTTP_400_BAD_REQUEST)
                assigned_site = _resolve_service_site(assigned_building)
                if assigned_site:
                    assigned_building = assigned_site.name
                full = _over_capacity(assigned_site, 1, request)
                if full:
                    return full
                claim = dict(set__status="Approved", set__assigned_building=assigned_building, set__punishment=punishment,
                             push__building_history=_building_entry(assigned_building, request))
            else:
                # Nothing to serve: the sanction is recorded and the case is done (it shows in the archives)
                claim = dict(set__status="Completed", set__punishment=punishment)

            # Claim the case in one database step: it only changes if it's still pending. When two admins
            # act at the same moment (approve + approve, or approve + dismiss), exactly one claim succeeds
            # and only an approval that won makes the e-ticket; the other admin is told it was reviewed.
            claimed = ViolationReport.objects(id=violation.id, status="Pending OSA Review").update_one(**claim)
            if not claimed:
                return Response({"error": "This violation was already reviewed by someone else."}, status=status.HTTP_409_CONFLICT)
            violation.reload()

            if hours <= 0:
                return Response({"message": f"Violation approved: {punishment}.", "punishment": punishment}, status=status.HTTP_200_OK)

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
            return Response({"message": f"Violation approved and assigned to {assigned_building}.", "punishment": punishment}, status=status.HTTP_200_OK)
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
        """Cases aren't dismissed by hand (older app versions still call this): a case is dismissed only when OSA
        rejects the faculty member who filed it (_dismiss_rejected_reporter_reports)."""
        return Response({"error": "Cases can't be dismissed by hand. A case is dismissed only when OSA rejects the faculty member who filed it."},
                        status=status.HTTP_403_FORBIDDEN)

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

    @action(detail=False, methods=['get'])
    def monthly_report(self, request):
        """One month of violations and community service, for the printable monthly report (admin Analytics
        and guard Analytics). ?month=YYYY-MM (Philippine time; default this month). Everyone gets the totals,
        charts and college breakdown; admins also get repeat violators and the case list. Student IDs are
        shown in full."""
        ph = datetime.timezone(datetime.timedelta(hours=8))
        today = datetime.datetime.now(ph)
        try:
            year, month = [int(x) for x in str(request.query_params.get('month') or '').split('-')]
            datetime.date(year, month, 1)
        except (TypeError, ValueError):
            year, month = today.year, today.month
        to_utc = lambda d: datetime.datetime(d.year, d.month, d.day, tzinfo=ph).astimezone(datetime.timezone.utc).replace(tzinfo=None)
        first = datetime.date(year, month, 1)
        next_first = datetime.date(year + (month == 12), month % 12 + 1, 1)
        prev_first = datetime.date(year - (month == 1), (month - 2) % 12 + 1, 1)
        start, end, prev_start = to_utc(first), to_utc(next_first), to_utc(prev_first)

        # Any period instead of a month (the admin's PDF for a day, month, quarter or year):
        # ?start=&end=&prev_start= as ISO times; the previous period runs from prev_start to start
        def parse_time(value):
            try:
                dt = datetime.datetime.fromisoformat(str(value).replace('Z', '+00:00'))
            except (TypeError, ValueError):
                return None
            return dt.astimezone(datetime.timezone.utc).replace(tzinfo=None) if dt.tzinfo else dt
        q_start, q_end = parse_time(request.query_params.get('start')), parse_time(request.query_params.get('end'))
        custom_range = bool(q_start and q_end and q_start < q_end and (q_end - q_start).days <= 400)
        if custom_range:
            q_prev = parse_time(request.query_params.get('prev_start'))
            start, end = q_start, q_end
            prev_start = q_prev if q_prev and q_prev < start else start - (end - start)

        reports = list(ViolationReport.objects(created_at__gte=start, created_at__lt=end).only(
            'id', 'student', 'violation_type', 'status', 'created_at').order_by('created_at'))
        prev_total = ViolationReport.objects(created_at__gte=prev_start, created_at__lt=start).count()
        student_refs = {getattr(r._data.get('student'), 'id', r._data.get('student')) for r in reports}
        students = {s.id: s for s in Student.objects(id__in=[i for i in student_refs if i]).only('student_id', 'department')}
        tickets = {getattr(t._data.get('violation'), 'id', t._data.get('violation')): t
                   for t in ETicket.objects(violation__in=[r.id for r in reports]).only('violation', 'total_hours_required', 'remaining_hours', 'status')}

        def status_label(r):
            t = tickets.get(r.id)
            if r.status == 'Dismissed':
                return 'Dismissed'
            if r.status == 'Pending OSA Review':
                return 'Pending'
            if r.status == 'Cleared' or (t and t.status == 'Cleared'):
                return 'Cleared'
            if r.status == 'Completed' or (t and t.status == 'Completed'):
                return 'Completed'
            return 'Active'

        labels = {r.id: status_label(r) for r in reports}
        counted = [r for r in reports if labels[r.id] != 'Dismissed']  # charts and breakdowns leave dismissed out
        approved = [r for r in reports if labels[r.id] in ('Active', 'Completed', 'Cleared')]
        completed = [r for r in approved if labels[r.id] in ('Completed', 'Cleared')]
        hours_assigned = sum((tickets[r.id].total_hours_required or 0) for r in approved if r.id in tickets)
        hours_rendered = sum(max(0, (tickets[r.id].total_hours_required or 0) - (tickets[r.id].remaining_hours or 0)) for r in approved if r.id in tickets)

        from collections import Counter
        by_type = Counter(r.violation_type or 'Other' for r in counted).most_common()
        # W1 = days 1-7, W2 = 8-14, ... (a 29-31 day month has a short W5); a custom period has no weeks here
        weeks = [] if custom_range else [0] * (((next_first - first).days - 1) // 7 + 1)
        for r in reports if not custom_range else []:
            day = r.created_at.replace(tzinfo=datetime.timezone.utc).astimezone(ph).day
            weeks[(day - 1) // 7] += 1
        def student_of(r):
            return students.get(getattr(r._data.get('student'), 'id', r._data.get('student')))
        by_college = Counter(
            ((student_of(r).department if student_of(r) else None) or 'Not recorded') for r in counted).most_common()

        data = {
            'month': f'{year:04d}-{month:02d}',
            'month_label': first.strftime('%B %Y'),
            'generated_at': _aware_iso(utc_now()),
            'generated_by': request.user.name or request.user.username,
            'summary': {
                'violations': len(reports),
                'previous_month': prev_total,
                'approved': len(approved),
                'dismissed': sum(1 for r in reports if labels[r.id] == 'Dismissed'),
                'pending': sum(1 for r in reports if labels[r.id] == 'Pending'),
                'hours_rendered': round(hours_rendered, 1),
                'hours_assigned': round(hours_assigned, 1),
                'completed': len(completed),
            },
            'by_type': [{'label': k, 'count': v} for k, v in by_type],
            'weekly': [{'label': f'W{i + 1}', 'count': c} for i, c in enumerate(weeks)],
            'by_college': [{'label': k, 'count': v} for k, v in by_college],
        }
        if role_of(request) == 'admin':
            per_student = Counter(student_of(r).student_id for r in counted if student_of(r))
            data['repeat_violators'] = [{'student_id': sid, 'cases': n} for sid, n in per_student.most_common() if n >= 2][:10]
            data['cases'] = [{
                'date': r.created_at.replace(tzinfo=datetime.timezone.utc).astimezone(ph).strftime('%b %d'),
                'student_id': (student_of(r).student_id if student_of(r) else ''),
                'violation': r.violation_type,
                'status': labels[r.id],
                'hours': round(tickets[r.id].total_hours_required or 0, 1) if r.id in tickets else 0,
            } for r in reports]
        return Response(data)

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
            "student_name": display_student_name(student) if student else None,
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
        scope = self.request.query_params.get('scope')
        if self.action == 'list' and scope == 'open':
            qs = qs.filter(status__ne='Cleared')
        elif self.action == 'list' and scope == 'archived':
            qs = qs.filter(status__in=['Cleared', 'Completed'])
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
        context = {**self.get_serializer_context(), 'ticket_extras': ticket_list_extras(tickets)}
        return Response(self.get_serializer(tickets, many=True, context=context).data)

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
    'left_area': 'Away from the service area too long',
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
        'student_name': display_student_name(student) if student else None,
        'violation_type': violation.violation_type if violation else None,
        'site_code': code,
        'building': name,
        'time_in': _aware_iso(log.time_in),
        'time_out': _aware_iso(log.time_out),
        'duration_seconds': round(log.duration_seconds or 0),
        # Time outside the service area (the timer was paused; not counted as served)
        'paused_seconds': round(session_paused_seconds(log, log.time_out or utc_now())),
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


# Tracked sessions: leaving the site pauses the timer (the time outside isn't counted) and coming back
# resumes it, so a student sent on an errand doesn't lose the session. Away for PAUSE_LIMIT_S in one go
# ends it. Turning location off is reported by the app within seconds and ends the session right away.
# Hearing nothing at all is different: Android delays background location to save battery, so a
# silent phone gets NO_LOCATION_LIMIT_S before the session ends as "location lost".
PAUSE_LIMIT_S = 10  # DEMO (normally 30 * 60)
NO_LOCATION_LIMIT_S = 120
SILENT_CHECK_EVERY_S = 15  # the check below runs at most this often per server process
_last_silent_check = [0.0]


def session_paused_seconds(log, until):
    """Seconds this session spent outside the site up to `until`: earlier trips plus the current one."""
    paused = log.paused_seconds or 0
    if log.outside_since and until and until > log.outside_since:
        paused += (until - log.outside_since).total_seconds()
    return paused


def end_session(log, eticket, reason, time_out=None, lat=None, lng=None, distance=None):
    """Closes a running session, deducts the time served (minus the time spent outside the site), and
    returns its receipt."""
    log.time_out = max(time_out or utc_now(), log.time_in)
    log.paused_seconds = min(session_paused_seconds(log, log.time_out), (log.time_out - log.time_in).total_seconds())
    duration = max(0, (log.time_out - log.time_in).total_seconds() - log.paused_seconds)
    log.duration_seconds = duration
    log.end_reason = reason if reason in TIMELOG_END_REASONS else 'scanned_out'
    log.out_lat, log.out_lng, log.out_distance_m = lat, lng, distance
    log.outside_since = None
    if not log.site_name:
        log.site_code, log.site_name = _session_site(eticket)
    log.save()

    eticket.remaining_hours = max(0, eticket.remaining_hours - duration / 3600)
    if eticket.remaining_hours <= 1 / 3600:  # DEMO (normally 0.01): a 1-minute penalty would finish after 24 s
        eticket.remaining_hours = 0
        eticket.status = "Completed"
        eticket.completed_at = utc_now()
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

    def get_queryset(self):
        qs = super().get_queryset()
        # ?scope=archived (the Archives page): only the sessions of finished tickets, not every session ever logged
        if self.action == 'list' and self.request.query_params.get('scope') == 'archived':
            qs = qs.filter(eticket__in=ETicket.objects(status__in=['Cleared', 'Completed']).only('id'))
        return qs

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
                # Only a registered service site's QR (its site code) starts the timer. The old hard-coded
                # OSA and building codes, and QRs carrying coordinates, are no longer accepted.
                site_code = str(request.data.get('site_code') or '').strip().upper()
                if not site_code:
                    return Response({"error": "Scan the QR code posted at your service site to start your timer."}, status=status.HTTP_400_BAD_REQUEST)

                # Assigned to a site: only that site's QR starts the timer (not other sites)
                assigned_code = _assigned_site_code(eticket)
                if assigned_code and site_code != assigned_code:
                    assigned = ServiceSite.objects.filter(site_code=assigned_code).first()
                    label = f"{assigned.name} ({assigned_code})" if assigned else assigned_code
                    return Response({"error": f"You're assigned to {label}. Scan the QR code posted there to start your timer."}, status=status.HTTP_400_BAD_REQUEST)

                running = TimeLog.objects.filter(eticket=eticket, time_out=None).first()

                # The geofence comes from the saved site, never from the phone
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
                    # A stop the website saved while offline (it saw the student leave, or location go off,
                    # but couldn't reach the server): it ends the session when that happened. Only ever
                    # earlier than now, so it can take time away but never add any.
                    # Sent as seconds ago (not a time), so a wrong phone clock doesn't matter
                    ago = _float_or_none(request.data.get('ended_seconds_ago'))
                    ended_at = utc_now() - datetime.timedelta(seconds=ago) if ago and 0 < ago < 30 * 86400 else None
                    if ended_at and ended_at < (time_out or utc_now()):
                        time_out = ended_at
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
        task and the open website. The server decides: outside the site pauses the timer (that time isn't
        counted) until the student is back, and PAUSE_LIMIT_S away in one go ends the session; location_off
        ends it at the last confirmed position.
        Returns {state: 'running' | 'paused' | 'stopped' | 'none', ...}; 'stopped' includes the receipt."""
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
                # Back at the site: the trip is added to the paused time and the timer runs again
                log.paused_seconds = session_paused_seconds(log, now)
                log.events = (log.events or []) + [{'type': 'returned', 'at': now, 'lat': lat, 'lng': lng, 'distance_m': distance}]
                log.outside_since = None
            log.save()
            return Response({"state": "running", "inside": True, "distance_m": distance,
                             "paused_seconds": round(log.paused_seconds or 0)})

        # Outside the site: the timer is paused from now until the student is back
        if not log.outside_since:
            log.outside_since = now
            log.events = (log.events or []) + [{'type': 'left_area', 'at': now, 'lat': lat, 'lng': lng, 'distance_m': distance}]
        outside_s = (now - log.outside_since).total_seconds()
        if outside_s >= PAUSE_LIMIT_S:
            receipt = end_session(log, eticket, 'left_area', lat=lat, lng=lng, distance=distance)
            return Response({"state": "stopped", "reason": "left_area", "receipt": receipt})
        log.save()
        return Response({"state": "paused", "inside": False, "distance_m": distance,
                         "paused_seconds": round(session_paused_seconds(log, now)),
                         "seconds_left": max(0, round(PAUSE_LIMIT_S - outside_s))})

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
