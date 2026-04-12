import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

def name_cleanup():
    print("Starting name-based deduplication...")
    seen_names = {}
    deleted_count = 0
    
    for student in Student.objects.all():
        name = str(student.name).strip().lower()
        if name in seen_names:
            print(f"DELETING DUPLICATE NAME: {student.name} (ID: {student.student_id})")
            student.delete()
            deleted_count += 1
        else:
            seen_names[name] = True

    print(f"Cleanup finished. Removed {deleted_count} duplicate names.")

if __name__ == "__main__":
    name_cleanup()
