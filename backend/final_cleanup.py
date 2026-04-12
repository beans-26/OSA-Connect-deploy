import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

def final_deduplicate():
    print("Starting final aggressive deduplication...")
    seen_ids = {}
    deleted_count = 0
    
    # Iterate through all students and enforce trimmed ID uniqueness
    for student in Student.objects.all():
        # Normalize: convert to string, remove tabs, spaces, and other whitespace
        clean_id = str(student.student_id).strip()
        
        if clean_id in seen_ids:
            print(f"DELETING DUPLICATE: Student {student.name} with ID variant '{student.student_id}'")
            student.delete()
            deleted_count += 1
        else:
            # If the ID was dirty but unique, fix it
            if student.student_id != clean_id:
                print(f"FIXING ID: '{student.student_id}' -> '{clean_id}'")
                student.student_id = clean_id
                student.save()
            seen_ids[clean_id] = True

    print(f"Cleanup finished. Removed {deleted_count} duplicates.")

if __name__ == "__main__":
    final_deduplicate()
