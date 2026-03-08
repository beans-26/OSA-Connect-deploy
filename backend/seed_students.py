import os
import django
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

print("Deleting all existing students in the database...")
Student.objects.all().delete()

students_data = [
    {
        "student_id": "2023303188",
        "name": "Vincent Dagaraga",
        "contact_number": "09358541420",
        "email": "vinsdagaraga@gmail.com",
        "course": "BSIT",
        "department": "CITC"
    },
    {
        "student_id": "2023303189",
        "name": "Mark Tajeros",
        "contact_number": "09358731470",
        "email": "marktajeros@gmail.com",
        "course": "BSIT",
        "department": "CITC"
    },
    {
        "student_id": "2023303199",
        "name": "Nyko Quezon",
        "contact_number": "09356782310",
        "email": "nykoquezon@gmail.com",
        "course": "BSIT",
        "department": "CITC"
    },
    {
        "student_id": "2023303179",
        "name": "Christian James Ambongan",
        "contact_number": "09356730509",
        "email": "cjambongan@gmail.com",
        "course": "BSIT",
        "department": "CITC"
    },
    {
        "student_id": "2023303178",
        "name": "Dominic Wacan",
        "contact_number": "09358359302",
        "email": "dominicwacan@gmail.com",
        "course": "BSIT",
        "department": "CITC"
    }
]

for idx, sd in enumerate(students_data):
    try:
        Student(**sd).save()
        print(f"[{idx+1}/5] Created student record for: {sd['name']} (ID: {sd['student_id']})")
    except Exception as e:
        print(f"Failed to create {sd['name']}: {str(e)}")

print("\nDatabase reset complete. All new students successfully stored!")
