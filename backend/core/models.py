from mongoengine import Document, StringField, DateTimeField, IntField, ReferenceField, EnumField, FloatField, BooleanField
import datetime
from enum import Enum

class OTPVerification(Document):
    email = StringField(required=True, unique=True)
    otp = StringField(required=True)
    created_at = DateTimeField(default=datetime.datetime.now)
    attempts = IntField(default=0)
    meta = {'collection': 'otp_verifications'}

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
    meta = {'collection': 'students'}

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
    meta = {'collection': 'violation_reports'}

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
    created_at = DateTimeField(default=datetime.datetime.now)
    meta = {'collection': 'etickets'}

class TimeLog(Document):
    eticket = ReferenceField(ETicket, required=True)
    time_in = DateTimeField(default=datetime.datetime.now)
    time_out = DateTimeField()
    duration_seconds = FloatField()
    photo_proof_in = StringField() # Base64 image when starting
    photo_proof_out = StringField() # Base64 image when stopping
    meta = {'collection': 'timelogs'}

class SystemUser(Document):
    username = StringField(required=True, unique=True)
    password = StringField(required=True) # In production, this should be hashed!
    full_name = StringField(default="OSA Administrator")
    bio = StringField(default="University of Science and Technology of Southern Philippines Personnel")
    role = StringField(required=True, choices=['admin', 'guard', 'student', 'staff', 'faculty'])
    meta = {'collection': 'system_users'}


class ServiceSite(Document):
    """A physical community service location registered by an admin from their phone's GPS.
    Its QR code encodes only site_code, so re-capturing the location keeps printed codes working."""
    site_code = StringField(required=True, unique=True)  # e.g. "LIB-01"
    name = StringField(required=True)
    description = StringField(default='')
    latitude = FloatField(required=True, min_value=-90, max_value=90)  # stored rounded to 7 decimals
    longitude = FloatField(required=True, min_value=-180, max_value=180)
    radius_m = IntField(default=50, min_value=10, max_value=300)
    accuracy_m = IntField()  # averaged GPS accuracy at capture time
    sample_count = IntField()  # number of GPS readings averaged
    is_active = BooleanField(default=True)
    registered_by = ReferenceField(SystemUser)
    registered_at = DateTimeField(default=datetime.datetime.now)
    updated_at = DateTimeField(default=datetime.datetime.now)
    meta = {'collection': 'service_sites', 'ordering': ['-registered_at']}
