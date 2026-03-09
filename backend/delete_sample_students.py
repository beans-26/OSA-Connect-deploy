import sys
import os
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

print("Looking for sample students...")

# Find students by name
sample_students = Student.objects.filter(name__icontains="sample data")
count = sample_students.count()

if count > 0:
    for student in sample_students:
        print(f"Deleting student: {student.name} (ID: {student.student_id})")
        student.delete()
    print(f"Successfully deleted {count} sample student(s).")
else:
    print("No students found with 'sample data' in their name.")
