import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

def list_marks():
    print("Listing all students with name Mark Tajeros:")
    marks = Student.objects.filter(name__icontains="Mark Tajeros")
    for m in marks:
        print(f"ID: {m.student_id} | Name: {m.name} | Year: {m.year_level} | DocID: {m.id}")

if __name__ == "__main__":
    list_marks()
