from mongoengine import Document, StringField, DateTimeField, IntField, ReferenceField, FloatField, BooleanField, ListField, DictField
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

class Student(Document):
    student_id = StringField(required=True, unique=True)
    name = StringField(required=True)
    course = StringField()
    department = StringField()
    year_level = StringField()
    gender = StringField()  # 'Male' or 'Female' (GENDERS in views.py); set at registration or by the reporting guard
    contact_number = StringField()
    email = StringField()
    password = StringField()
    qr_data = StringField()
    meta = {'collection': 'students', 'auto_create_index': False, 'strict': False}

class ViolationReport(Document):
    student = ReferenceField(Student, required=True)
    violation_type = StringField(required=True)
    description = StringField()
    reporting_guard = StringField(required=True)
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
    meta = {'collection': 'violation_reports', 'auto_create_index': False, 'strict': False}


class ClearanceProof(Document):
    """Photo of a clearance document: the signed FM-USTP-OSA-013 form or the reflection paper, one of each
    per violation. Kept apart from the violation so the violation lists stay small (an image is only loaded
    when an admin opens it)."""
    violation = ReferenceField(ViolationReport, required=True)
    kind = StringField(required=True)  # 'iso_form' or 'reflection' (CLEARANCE_FILES in views.py)
    image = StringField(required=True)  # data URL (JPEG, resized in the browser)
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
    outside_since = DateTimeField()  # set while the student is outside the site
    meta = {'collection': 'timelogs', 'auto_create_index': False, 'strict': False}

class SystemUser(Document):
    username = StringField(required=True, unique=True)
    password = StringField(required=True)  # Django password hash (core/passwords.py); older accounts: plain until next login
    full_name = StringField(default="OSA Administrator")
    bio = StringField(default="University of Science and Technology of Southern Philippines Personnel")
    # admin = OSA staff; staff = faculty and other school staff (teachers, instructors); guard = campus guards
    role = StringField(required=True, choices=['admin', 'guard', 'student', 'staff'])
    is_active = BooleanField(default=True)  # disabled accounts can't log in (manage.py create_account --disable)
    meta = {'collection': 'system_users', 'auto_create_index': False, 'strict': False}


class ServiceSite(Document):
    """A physical community service location registered by an admin from their phone's GPS.
    Its QR code encodes only site_code, so re-capturing the location keeps printed codes working."""
    site_code = StringField(required=True, unique=True)  # e.g. "LIB-01"
    name = StringField(required=True)
    description = StringField(default='')
    latitude = FloatField(required=True, min_value=-90, max_value=90)  # stored rounded to 7 decimals
    longitude = FloatField(required=True, min_value=-180, max_value=180)
    radius_m = IntField(default=50, min_value=10, max_value=300)
    capacity = IntField(default=10, min_value=1, max_value=500)  # students with an unfinished ticket here at once
    accuracy_m = IntField()  # averaged GPS accuracy at capture time
    sample_count = IntField()  # number of GPS readings averaged
    is_active = BooleanField(default=True)
    registered_by = ReferenceField(SystemUser)
    registered_at = DateTimeField(default=utc_now)
    updated_at = DateTimeField(default=utc_now)
    meta = {'collection': 'service_sites', 'ordering': ['-registered_at'], 'auto_create_index': False, 'strict': False}
