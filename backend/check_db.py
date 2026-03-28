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
    ticket_count = ETicket.objects.filter(violation=v).count()
    print(f" - [{v.id}] Student: {v.student.student_id} | Type: {v.violation_type} | Puns: {v.punishment} | Status: {v.status} | HasTicket: {ticket_count}")

print("\nETickets:")
for t in ETicket.objects.all():
    try:
        violation_id = str(t.violation.id) if t.violation else "None"
        student_id = t.violation.student.student_id if t.violation and t.violation.student else "Unknown"
        print(f" - [{t.id}] Student: {student_id} | Violation: {violation_id} | Hrs: {t.remaining_hours}/{t.total_hours_required} | Status: {t.status}")
    except Exception as ev:
        print(f" - [{t.id}] Broken: {str(ev)}")

print("\nTimeLogs:")
for l in TimeLog.objects.all():
    try:
        print(f" - Log for ticket {l.eticket.id} - In: {l.time_in} Out: {l.time_out} Dur: {l.duration_seconds}")
    except:
        print(f" - Broken log")
