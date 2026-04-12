import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

def remove_duplicates():
    print("Checking for duplicate student records...")
    all_students = Student.objects.all()
    seen_ids = set()
    duplicates_removed = 0

    for student in all_students:
        if student.student_id in seen_ids:
            print(f"Removing duplicate: {student.student_id} ({student.name})")
            student.delete()
            duplicates_removed += 1
        else:
            seen_ids.add(student.student_id)

    print(f"Cleanup complete. Removed {duplicates_removed} duplicate records.")

if __name__ == "__main__":
    remove_duplicates()
