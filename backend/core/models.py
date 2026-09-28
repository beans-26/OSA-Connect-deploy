from mongoengine import Document, StringField, DateTimeField, IntField, ReferenceField, EnumField, FloatField, BooleanField, ListField, DictField
import datetime
from enum import Enum

# Every model sets auto_create_index False: otherwise mongoengine asks for the Atlas primary before the
# first query on each collection, and each Vercel cold start stalls whenever the primary is slow to answer.
# The indexes (unique student_id, username, otp email, site_code) already exist in the database;
# a brand-new database needs them created once, e.g. Student.ensure_indexes().

class OTPVerification(Document):
    email = StringField(required=True, unique=True)
    otp = StringField(required=True)
    created_at = DateTimeField(default=datetime.datetime.now)
    attempts = IntField(default=0)
    meta = {'collection': 'otp_verifications', 'auto_create_index': False}

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
    contact_number = StringField()
    email = StringField()
    password = StringField()
    qr_data = StringField()
    meta = {'collection': 'students', 'auto_create_index': False}

class ViolationReport(Document):
    student = ReferenceField(Student, required=True)
    violation_type = StringField(required=True)
    description = StringField()
    reporting_guard = StringField(required=True)
    status = StringField(default=ViolationStatus.PENDING.value)
    offense_count = IntField(default=1)
    punishment = StringField()
    assigned_building = StringField() # New field for OSA review
    created_at = DateTimeField(default=datetime.datetime.now)
    meta = {'collection': 'violation_reports', 'auto_create_index': False}

class ETicket(Document):
    violation = ReferenceField(ViolationReport, required=True)
    assigned_location = StringField(required=True)
    total_hours_required = FloatField(required=True)
    remaining_hours = FloatField(required=True)
    status = StringField(default=ETicketStatus.ACTIVE.value)
    lat = FloatField() # Allowed Geofence Lat
    lng = FloatField() # Allowed Geofence Lng
    radius = FloatField(default=100.0) # Allowed Radius in Meters
    site_code = StringField() # Service site of the current session, when started from a site QR
    assigned_site_code = StringField() # Site the admin assigned; the timer only starts with this site's QR
    created_at = DateTimeField(default=datetime.datetime.now)
    meta = {'collection': 'etickets', 'auto_create_index': False}

class TimeLog(Document):
    eticket = ReferenceField(ETicket, required=True)
    time_in = DateTimeField(default=datetime.datetime.now)
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
    meta = {'collection': 'timelogs', 'auto_create_index': False}

class SystemUser(Document):
    username = StringField(required=True, unique=True)
    password = StringField(required=True) # In production, this should be hashed!
    full_name = StringField(default="OSA Administrator")
    bio = StringField(default="University of Science and Technology of Southern Philippines Personnel")
    role = StringField(required=True, choices=['admin', 'guard', 'student', 'staff', 'faculty'])
    meta = {'collection': 'system_users', 'auto_create_index': False}


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
    registered_at = DateTimeField(default=datetime.datetime.now)
    updated_at = DateTimeField(default=datetime.datetime.now)
    meta = {'collection': 'service_sites', 'ordering': ['-registered_at'], 'auto_create_index': False}
