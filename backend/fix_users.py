import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import SystemUser, Student

def fix_users():
    print("Fixing users...")
    
    # Ensure all key roles exist
    users = [
        {"username": "admin", "password": "admin", "role": "admin", "full_name": "System Admin"},
        {"username": "staff", "password": "staff", "role": "admin", "full_name": "Staff Personnel"},
        {"username": "guard", "password": "guard", "role": "guard", "full_name": "Gate Guard"},
        {"username": "faculty", "password": "faculty", "role": "faculty", "full_name": "University Faculty"},
    ]
    
    for u in users:
        # Find OR Update
        user = SystemUser.objects.filter(username=u["username"]).first()
        if not user:
            print(f"Creating user: {u['username']}")
            SystemUser(**u).save()
        else:
            print(f"User {u['username']} already exists. Ensuring correct role/password.")
            user.role = u["role"]
            user.password = u["password"]
            user.save()

    # Create test students if missing
    students = [
        {"id": "2023303188", "name": "Vincent Dagaraga"},
        {"id": "2023303189", "name": "Mark Tajeros"},
        {"id": "2023303199", "name": "Nyko Quezon"},
        {"id": "2023303179", "name": "Christian James Ambongan"},
        {"id": "2023303178", "name": "Dominic Wacan"}
    ]
    
    for s in students:
        student = Student.objects.filter(student_id=s["id"]).first()
        if not student:
            print(f"Creating student: {s['id']}")
            Student(student_id=s["id"], name=s["name"], course="BSIT", department="CITC").save()

    print("Complete! All accounts are now active.")

if __name__ == "__main__":
    fix_users()
