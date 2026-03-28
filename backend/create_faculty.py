import sys
import os
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import SystemUser

def create_faculty():
    if not SystemUser.objects.filter(username="faculty").first():
        SystemUser(
            username="faculty", 
            password="faculty", 
            role="faculty", 
            full_name="University Faculty",
            bio="Academic personnel authorized to report student misconduct."
        ).save()
        print("Faculty user 'faculty' created successfully with password 'faculty'.")
    else:
        print("Faculty user 'faculty' already exists.")

if __name__ == "__main__":
    create_faculty()
