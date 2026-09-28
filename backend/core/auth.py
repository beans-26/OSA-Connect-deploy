"""Login tokens and role checks for the API.

After a successful /api/login/ the client gets a signed token and sends it on every request as
`Authorization: Bearer <token>`. The server checks it each time and loads the account, so a disabled
account or a changed password stops the old token from working.

Roles: admin = OSA staff, staff = faculty & staff, guard = campus guards, student.
"""
import hashlib
import time

from django.core import signing
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission

from .models import Student, SystemUser

TOKEN_SALT = 'osaconnect-login'
TOKEN_MAX_AGE_S = 30 * 24 * 3600  # students stay logged in on their phone for a month
REPORTER_ROLES = ('admin', 'staff', 'guard')


def _password_mark(stored_password):
    """Short fingerprint of the stored password: changing the password invalidates old tokens."""
    return hashlib.sha256(str(stored_password or '').encode()).hexdigest()[:12]


def issue_token(role, username, stored_password):
    return signing.dumps({'r': role, 'u': username, 'p': _password_mark(stored_password)}, salt=TOKEN_SALT, compress=True)


class Identity:
    """Who is making the request (request.user)."""
    is_authenticated = True
    is_anonymous = False

    def __init__(self, role, username, name=''):
        self.role = role
        self.username = username
        self.name = name

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_student(self):
        return self.role == 'student'


EXPIRED = 'Your login has expired. Please log in again.'

# Checking a login loads the account, a database round trip on every request. A checked login is
# remembered for a minute; forget_account() drops it at once after a password change or disable.
RECENT_TTL_S = 60
_recent = {}


def forget_account(username):
    for token, (identity, _) in list(_recent.items()):
        if identity.username == username:
            _recent.pop(token, None)


class TokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        header = request.META.get('HTTP_AUTHORIZATION', '')
        if not header.startswith('Bearer '):
            return None
        token = header[7:].strip()
        cached = _recent.get(token)
        if cached and cached[1] > time.monotonic():
            return cached[0], None
        try:
            data = signing.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE_S)
        except signing.BadSignature:
            raise AuthenticationFailed(EXPIRED)
        role, username, mark = data.get('r'), data.get('u'), data.get('p')
        if role == 'student':
            student = Student.objects(student_id=username).only('student_id', 'name', 'password').first()
            if not student or _password_mark(student.password) != mark:
                raise AuthenticationFailed(EXPIRED)
            identity = Identity('student', student.student_id, student.name)
        else:
            user = SystemUser.objects(username=username).first()
            if not user or user.is_active is False or user.role != role or _password_mark(user.password) != mark:
                raise AuthenticationFailed(EXPIRED)
            identity = Identity(user.role, user.username, user.full_name)
        if len(_recent) > 5000:
            _recent.clear()
        _recent[token] = (identity, time.monotonic() + RECENT_TTL_S)
        return identity, None

    def authenticate_header(self, request):
        # Makes DRF answer 401 (log in again) instead of 403 when there is no valid token
        return 'Bearer'


def role_of(request):
    return getattr(request.user, 'role', None)


class IsAdmin(BasePermission):
    message = 'Only OSA administrators can do this.'

    def has_permission(self, request, view):
        return role_of(request) == 'admin'


class IsReporter(BasePermission):
    """Guards, faculty & staff, and admins (people who file violation reports)."""
    message = 'Only guards, faculty & staff, and OSA administrators can do this.'

    def has_permission(self, request, view):
        return role_of(request) in REPORTER_ROLES


class IsStudent(BasePermission):
    message = 'Only students can do this.'

    def has_permission(self, request, view):
        return role_of(request) == 'student'


class IsLoggedIn(BasePermission):
    message = 'Please log in.'

    def has_permission(self, request, view):
        return role_of(request) is not None


def owns_ticket(request, eticket):
    """Admins may act on any ticket; a student only on their own."""
    role = role_of(request)
    if role == 'admin':
        return True
    if role != 'student':
        return False
    try:
        return eticket.violation.student.student_id == request.user.username
    except Exception:
        return False
