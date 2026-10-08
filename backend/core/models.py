import re
from mongoengine import Document, StringField, DateTimeField, IntField, ReferenceField, FloatField, BooleanField, ListField, DictField, BinaryField
import datetime
from enum import Enum


def utc_now():
    """Current time as naive UTC. Every saved time uses this, so records written by the laptop's backend
    (Philippine time) and by Vercel (UTC) agree; the API sends them marked as UTC ("...Z")."""
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

# Every model sets strict False: records may carry fields a newer version of the code saved (the laptop and
# Vercel share one database), and an older version must still load them instead of failing.
# Every model sets auto_create_index False: otherwise mongoengine asks for the Atlas primary before the
# first query on each collection, and each Vercel cold start stalls whenever the primary is slow to answer.
# The indexes (unique student_id, username, otp email, site_code) already exist in the database;
# a brand-new database needs them created once, e.g. Student.ensure_indexes().

class OTPVerification(Document):
    email = StringField(required=True, unique=True)
    otp = StringField(required=True)
    created_at = DateTimeField(default=utc_now)
    attempts = IntField(default=0)
    meta = {'collection': 'otp_verifications', 'auto_create_index': False, 'strict': False}

class ViolationStatus(Enum):
    PENDING = "Pending OSA Review"
    APPROVED = "Approved"
    DISMISSED = "Dismissed"

class ETicketStatus(Enum):
    ACTIVE = "Active"
    ONGOING = "Ongoing"
    COMPLETED = "Completed"
    CLEARED = "Cleared"
    FINISHED = "Finished"

ROMAN_SUFFIXES = {'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'}


def format_person_name(value):
    """A name as the admin pages show it: every part starts with a capital letter, whatever the student
    typed. "vincent macahilos DAGARAGA" -> "Vincent Macahilos Dagaraga", "bautista-reyes" -> "Bautista-Reyes",
    "o'neil" -> "O'Neil". A part typed with its own mixed capitals keeps them ("McDonald"); III, IV stay."""
    def part(p):
        if not p:
            return p
        if p.rstrip('.').upper() in ROMAN_SUFFIXES and len(p.rstrip('.')) > 1:
            return p.upper()
        if p.islower() or p.isupper():
            p = p.lower()
        return p[0].upper() + p[1:]

    def word(w):
        w = '-'.join(part(p) for p in w.split('-'))
        # O'Neil, D'Angelo: the letter after an apostrophe is capital too (not for a lone letter like "s")
        pieces = w.split("'")
        return "'".join(pieces[:1] + [p[0].upper() + p[1:] if len(p) > 1 else p for p in pieces[1:]])

    return ' '.join(word(w) for w in str(value or '').split())


class Student(Document):
    student_id = StringField(required=True, unique=True)
    name = StringField(required=True)
    # The name's parts, kept since 2026-10 (registration, and the report form's typed name). Pages show
    # "First M. Last" (display_student_name); older records only have `name`, which is split instead.
    first_name = StringField()
    middle_name = StringField()  # in full from registration; a report form only has the initial
    last_name = StringField()
    course = StringField()
    department = StringField()
    year_level = StringField()
    gender = StringField()  # 'Male' or 'Female' (GENDERS in views.py); set at registration or by the reporting guard
    contact_number = StringField()
    email = StringField()
    password = StringField()
    qr_data = StringField()
    meta = {'collection': 'students', 'auto_create_index': False, 'strict': False}

    def clean(self):
        # Runs on every save (registration, guard reports, admin edits): names are stored capitalized
        self.name = format_person_name(self.name) or self.name
        self.first_name = format_person_name(self.first_name) or self.first_name
        self.middle_name = format_person_name(self.middle_name) or self.middle_name
        self.last_name = format_person_name(self.last_name) or self.last_name


# Words that start a last name ("Dela Cruz", "De los Santos", "San Juan"), so they aren't read as a middle name
LAST_NAME_PARTICLES = {'de', 'del', 'dela', 'delos', 'la', 'las', 'los', 'san', 'santa', 'sta', 'sta.', 'sto', 'sto.',
                       'santo', 'van', 'von', 'di', 'da', 'dos', 'du', 'mac', 'mc'}
NAME_SUFFIXES = {'jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v'}


def student_name_parts(student):
    """(first, middle initial, last) of a student. From the saved parts when there are any; older records only
    have the full name "First Middle Last", read as: the last word (with any particles before it, and a suffix
    after it) is the last name, the word before it the middle name, the rest the first name. A first name of two
    words with no middle name ("John Paul Reyes") can't be told apart there."""
    if student.first_name and student.last_name:
        middle = (student.middle_name or '').strip()
        return student.first_name, (middle[0].upper() if middle and not re.match(r'^n\s*/?\s*a$', middle, re.I) else ''), student.last_name
    words = (student.name or '').split()
    suffix = words.pop() if len(words) > 2 and words[-1].lower().rstrip(',') in NAME_SUFFIXES else ''
    if len(words) < 3:
        first, initial, last = ' '.join(words[:1]), '', ' '.join(words[1:])
    else:
        i = len(words) - 1
        while i - 1 >= 1 and words[i - 1].lower() in LAST_NAME_PARTICLES:
            i -= 1
        if i >= 2:
            first, initial, last = ' '.join(words[:i - 1]), words[i - 1][0].upper(), ' '.join(words[i:])
        else:
            first, initial, last = ' '.join(words[:i]), '', ' '.join(words[i:])
    return first, initial, ' '.join(p for p in (last, suffix) if p)


def display_student_name(student):
    """'Juan D. Dela Cruz': the name pages show, with the middle name as an initial."""
    first, initial, last = student_name_parts(student)
    return ' '.join(p for p in (first, f'{initial}.' if initial else '', last) if p) or student.name

class ViolationReport(Document):
    student = ReferenceField(Student, required=True)
    violation_type = StringField(required=True)
    description = StringField()
    # Who reported it, as shown everywhere: for a guard account, the name of the guard on duty they typed
    # (the guards share accounts); for faculty & staff and admins, their account's name
    reporting_guard = StringField(required=True)
    reporting_account = StringField()  # the login that filed it (username); a guard's History lists by this
    # Faculty file without an account (views.faculty_report): the USTP email they confirmed with a code, and
    # the name read from it, which OSA checks against its faculty records in Pending Reviews
    reporting_email = StringField()
    reporter_first_name = StringField()
    reporter_last_name = StringField()
    dismissed_at = DateTimeField()
    # Set when the report was dismissed without an admin opening it: OSA rejected its faculty reporter
    # (views.faculty_email_decision / faculty_account_decision)
    dismissed_reason = StringField()
    status = StringField(default=ViolationStatus.PENDING.value)
    offense_count = IntField(default=1)
    punishment = StringField()
    assigned_building = StringField() # New field for OSA review
    # Every building the violation was assigned to, oldest first: {name, at, by} (approval, then each change)
    building_history = ListField(DictField())
    created_at = DateTimeField(default=utc_now)
    # After the hours are served the student brings the signed ISO form and a reflection paper to OSA:
    # the admin uploads a photo of each (ClearanceProof) and clears the violation, which moves it to the archives
    iso_form_uploaded_at = DateTimeField()
    reflection_uploaded_at = DateTimeField()
    cleared_at = DateTimeField()
    cleared_by = StringField()
    # When the clearance photos were deleted to save space, PHOTO_KEEP_DAYS after clearing (views.py); the case stays
    photos_removed_at = DateTimeField()
    meta = {'collection': 'violation_reports', 'auto_create_index': False, 'strict': False}


class ClearanceProof(Document):
    """Photo of a clearance document: the signed FM-USTP-OSA-013 form or the reflection paper, one of each
    per violation. Kept apart from the violation so the violation lists stay small (an image is only loaded
    when an admin opens it)."""
    violation = ReferenceField(ViolationReport, required=True)
    kind = StringField(required=True)  # 'iso_form' or 'reflection' (CLEARANCE_FILES in views.py)
    data = BinaryField()  # the photo file itself (WebP or JPEG, shrunk in the browser to under ~90 KB)
    content_type = StringField()  # 'image/webp', 'image/jpeg' or 'image/png'
    image = StringField()  # uploads before 2026-09-30: the photo as base64 data-URL text (a third bigger)
    uploaded_at = DateTimeField(default=utc_now)
    uploaded_by = StringField()
    meta = {'collection': 'clearance_proofs', 'auto_create_index': False, 'strict': False}

class ETicket(Document):
    # One e-ticket per violation: a unique index, created once in the database (ETicket.ensure_indexes())
    violation = ReferenceField(ViolationReport, required=True, unique=True)
    assigned_location = StringField(required=True)
    total_hours_required = FloatField(required=True)
    remaining_hours = FloatField(required=True)
    status = StringField(default=ETicketStatus.ACTIVE.value)
    lat = FloatField() # Allowed Geofence Lat
    lng = FloatField() # Allowed Geofence Lng
    radius = FloatField(default=100.0) # Allowed Radius in Meters
    site_code = StringField() # Service site of the current session, when started from a site QR
    assigned_site_code = StringField() # Site the admin assigned; the timer only starts with this site's QR
    iso_form_printed_at = DateTimeField() # No longer used (the ISO form was once per ticket; now unlimited)
    # Hours added for days missed after the 3-day deadline (core/deadlines.py); already in total/remaining
    added_hours = FloatField(default=0)
    missed_days = ListField(StringField())  # 'YYYY-MM-DD' Philippine dates that added an hour
    missed_checked_through = StringField()  # last day already checked, so no day is counted twice
    created_at = DateTimeField(default=utc_now)
    completed_at = DateTimeField()  # when the last hour was served (the student's "Hours completed" notification)
    meta = {'collection': 'etickets', 'auto_create_index': False, 'strict': False}

class TimeLog(Document):
    eticket = ReferenceField(ETicket, required=True)
    time_in = DateTimeField(default=utc_now)
    time_out = DateTimeField()
    duration_seconds = FloatField()
    photo_proof_in = StringField() # Base64 image when starting
    photo_proof_out = StringField() # Base64 image when stopping
    # Session receipt: where it was served, how it ended, and what happened in between
    site_code = StringField()
    site_name = StringField()
    end_reason = StringField()  # one of TIMELOG_END_REASONS in views.py
    out_lat = FloatField()
    out_lng = FloatField()
    out_distance_m = FloatField()  # distance from the site when the session ended
    events = ListField(DictField())  # {type, at, lat, lng, distance_m}: left_area, returned, location_off, location_on
    # Location tracking (sessions started by clients that send location pings, also from the background)
    tracked = BooleanField(default=False)
    last_ping_at = DateTimeField()  # last time the student's position was confirmed
    last_lat = FloatField()
    last_lng = FloatField()
    outside_since = DateTimeField()  # set while the student is outside the site (the timer is paused)
    # Time spent outside the site in earlier trips this session; not counted as served (the receipt's "Out of area")
    paused_seconds = FloatField(default=0)
    meta = {'collection': 'timelogs', 'auto_create_index': False, 'strict': False}

class SystemUser(Document):
    username = StringField(required=True, unique=True)
    password = StringField(required=True)  # Django password hash (core/passwords.py); older accounts: plain until next login
    full_name = StringField(default="OSA Administrator")
    bio = StringField(default="University of Science and Technology of Southern Philippines Personnel")
    # admin = OSA staff; staff = faculty and other school staff (teachers, instructors); guard = campus guards
    role = StringField(required=True, choices=['admin', 'guard', 'student', 'staff'])
    is_active = BooleanField(default=True)  # disabled accounts can't log in (manage.py create_account --disable)
    # Faculty who made their own account (views.faculty_signup): their USTP email (also the username) and the
    # name they typed, put on their reports. faculty_status: 'pending' (can't log in until OSA confirms them),
    # 'verified', or 'rejected'. Accounts OSA made (create_account) have none.
    email = StringField()
    first_name = StringField()
    last_name = StringField()
    faculty_status = StringField()
    registered_at = DateTimeField()
    meta = {'collection': 'system_users', 'auto_create_index': False, 'strict': False}


class FacultyInvite(Document):
    """A USTP email a faculty member reported with, without an account (views.faculty_report). OSA confirms it's
    real faculty in Admin > Faculty Accounts; the faculty member then gets an email to finish making an account
    (/faculty/signup?invite=...), which is active at once.
    status: 'unconfirmed' -> 'invited' (confirmed, email sent) -> 'registered'; or 'rejected'."""
    email = StringField(required=True, unique=True)
    first_name = StringField()  # read from the email (views.name_from_ustp_email)
    last_name = StringField()
    status = StringField(default='unconfirmed')
    first_report_at = DateTimeField(default=utc_now)
    decided_at = DateTimeField()
    decided_by = StringField()
    meta = {'collection': 'faculty_invites', 'auto_create_index': False, 'strict': False}


class ServiceSite(Document):
    """A physical community service location registered by an admin from their phone's GPS.
    Its QR code encodes only site_code, so re-capturing the location keeps printed codes working."""
    site_code = StringField(required=True, unique=True)  # e.g. "LIB-01"
    name = StringField(required=True)
    description = StringField(default='')
    latitude = FloatField(required=True, min_value=-90, max_value=90)  # stored rounded to 7 decimals
    longitude = FloatField(required=True, min_value=-180, max_value=180)
    radius_m = IntField(default=50, min_value=3, max_value=300)
    capacity = IntField(default=10, min_value=1, max_value=500)  # students with an unfinished ticket here at once
    accuracy_m = IntField()  # averaged GPS accuracy at capture time
    sample_count = IntField()  # number of GPS readings averaged
    is_active = BooleanField(default=True)
    registered_by = ReferenceField(SystemUser)
    registered_at = DateTimeField(default=utc_now)
    updated_at = DateTimeField(default=utc_now)
    meta = {'collection': 'service_sites', 'ordering': ['-registered_at'], 'auto_create_index': False, 'strict': False}


def faculty_reporter_status(email):
    """Whether OSA has confirmed the faculty member behind a USTP email: 'unconfirmed' (filed without an account,
    or a sign-up OSA hasn't confirmed), 'rejected', or None (confirmed, or an account OSA made)."""
    email = (email or '').lower()
    if not email:
        return None
    invite = FacultyInvite.objects(email=email).only('status').first()
    if invite and invite.status in ('unconfirmed', 'rejected'):
        return invite.status
    account = SystemUser.objects(username=email).only('faculty_status').first() or SystemUser.objects(email=email).only('faculty_status').first()
    if account:
        return {'pending': 'unconfirmed', 'rejected': 'rejected'}.get(account.faculty_status)
    return None if invite else 'unconfirmed'


def report_reporter_role(report):
    """Who filed a report: 'faculty' (a faculty account or a USTP email), 'guard', or 'admin' (OSA). Reports from
    before reporting_account was kept came from guards."""
    if getattr(report, 'reporting_email', None):
        return 'faculty'
    account = SystemUser.objects(username=report.reporting_account).only('role').first() if report.reporting_account else None
    role = account.role if account else 'guard'
    return 'faculty' if role == 'staff' else role
