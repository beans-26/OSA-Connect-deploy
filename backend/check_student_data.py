import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student, ViolationReport, ETicket

def check_student():
    sid = "2023303188"
    try:
        student = Student.objects.get(student_id=sid)
        print(f"DEBUG: Checking student {student.name} ({student.student_id})")
        
        violations = ViolationReport.objects.filter(student=student)
        print(f"Found {len(violations)} Violations")
        for v in violations:
            print(f" - [{v.id}] Puns: '{v.punishment}' | Status: {v.status}")
            
            tickets = ETicket.objects.filter(violation=v)
            print(f"   ETickets associated: {len(tickets)}")
            for t in tickets:
                print(f"     -> Ticket {t.id} | Rem: {t.remaining_hours}/{t.total_hours_required} hrs")
                
    except Student.DoesNotExist:
        print("Student not found!")

if __name__ == "__main__":
    check_student()
