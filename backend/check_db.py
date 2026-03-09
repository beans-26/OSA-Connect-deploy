import sys
import os
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student, ViolationReport, ETicket, TimeLog

print("Students:")
for s in Student.objects.all():
    print(f" - {s.student_id}: {s.name}")

print("\nViolations:")
for v in ViolationReport.objects.all():
    print(f" - {v.id}: {v.student.name} - {v.violation_type} - {v.status}")

print("\nETickets:")
for t in ETicket.objects.all():
    print(f" - {t.id}: {t.violation.violation_type} - Hrs: {t.remaining_hours}/{t.total_hours_required} - {t.status}")

print("\nTimeLogs:")
for l in TimeLog.objects.all():
    try:
        print(f" - Log for ticket {l.eticket.id} - In: {l.time_in} Out: {l.time_out} Dur: {l.duration_seconds}")
    except:
        print(f" - Broken log")
