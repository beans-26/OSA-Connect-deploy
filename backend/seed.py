import mongoengine
import datetime
import random

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import certifi

# Connect to MongoDB using URI from environment or settings
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/OSAConnect_deploymenttest')
print(f"Connecting to: {MONGODB_URI}")
mongoengine.disconnect()
# Use most permissive settings to bypass local handshake errors for seeding
mongoengine.connect(host=MONGODB_URI, tlsAllowInvalidCertificates=True)

from core.models import Student, ViolationReport, ETicket, TimeLog, SystemUser

def seed_data():
    print("Seeding database...")
    
    # Clear existing data
    Student.objects.all().delete()
    ViolationReport.objects.all().delete()
    ETicket.objects.all().delete()
    TimeLog.objects.all().delete()
    SystemUser.objects.all().delete()

    # Create Students
    Student(student_id="2023303188", name="Vincent Dagaraga", contact_number="09358541420", email="vinsdagaraga@gmail.com", course="BSIT", department="CITC").save()
    Student(student_id="2023303189", name="Mark Tajeros", contact_number="09358731470", email="marktajeros@gmail.com", course="BSIT", department="CITC").save()
    Student(student_id="2023303199", name="Nyko Quezon", contact_number="09356782310", email="nykoquezon@gmail.com", course="BSIT", department="CITC").save()
    Student(student_id="2023303179", name="Christian James Ambongan", contact_number="09356730509", email="cjambongan@gmail.com", course="BSIT", department="CITC").save()
    Student(student_id="2023303178", name="Dominic Wacan", contact_number="09358359302", email="dominicwacan@gmail.com", course="BSIT", department="CITC").save()

    # Create System Users
    SystemUser(username="admin", password="admin", role="admin").save()
    SystemUser(username="guard", password="guard", role="guard").save()

    print("Success! Database seeded with 5 real students, 1 staff admin, and 1 guard.")


if __name__ == "__main__":
    seed_data()
