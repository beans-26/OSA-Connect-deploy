import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

def deep_cleanup():
    print("Starting deep cleanup of Student IDs...")
    all_students = Student.objects.all()
    
    # First pass: Trim all IDs
    print("Normalizing all IDs (trimming whitespace and tabs)...")
    for student in all_students:
        original_id = student.student_id
        cleaned_id = str(original_id).strip()
        if original_id != cleaned_id:
            print(f"Cleaned: '{original_id}' -> '{cleaned_id}'")
            student.student_id = cleaned_id
            try:
                student.save()
            except Exception as e:
                print(f"Could not save {cleaned_id} (likely duplicate): {e}")

    # Second pass: Remove duplicates
    print("Deduplicating...")
    seen_ids = {}
    for student in Student.objects.all():
        sid = student.student_id
        if sid in seen_ids:
            print(f"Removing duplicate for ID: {sid}")
            student.delete()
        else:
            seen_ids[sid] = True

    print("Cleanup complete!")

if __name__ == "__main__":
    deep_cleanup()
