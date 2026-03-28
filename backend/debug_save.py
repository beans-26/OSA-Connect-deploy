import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student, ViolationReport, ETicket

def debug_creation():
    sid = "2023303188"
    try:
        student = Student.objects.get(student_id=sid)
        print(f"DEBUG: Found {student.name}")
        
        # 1. Create Report
        v = ViolationReport(
            student=student,
            violation_type="Debug Test",
            reporting_guard="Admin",
            status="Approved",
            offense_count=1,
            punishment="5 hours",
        ).save()
        print(f"DEBUG: Saved Report {v.id}")
        
        # 2. Create ETicket
        print("DEBUG: Attempting ETicket save...")
        try:
            t = ETicket(
                violation=v,
                assigned_location="TEST_LOC",
                total_hours_required=5.0,
                remaining_hours=5.0,
                status="Active"
            ).save()
            print(f"DEBUG: SUCCESS! Saved ETicket {t.id}")
        except Exception as e:
            print(f"DEBUG: FAILED TO SAVE ETICKET! Error: {str(e)}")
            
    except Exception as e:
        print(f"DEBUG: CRITICAL ERROR! {str(e)}")

if __name__ == "__main__":
    debug_creation()
