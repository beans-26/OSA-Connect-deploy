import sys
import os
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import ViolationReport, ETicket, TimeLog

print("Starting database cleanup...")

# 1. Delete all TimeLogs
deleted_logs = TimeLog.objects.all().delete()
print(f"Deleted {deleted_logs} time logs.")

# 2. Delete all ETickets (Timers)
deleted_tickets = ETicket.objects.all().delete()
print(f"Deleted {deleted_tickets} active/completed timers.")

# 3. Delete all Violation Reports
deleted_violations = ViolationReport.objects.all().delete()
print(f"Deleted {deleted_violations} violation records.")

print("Cleanup complete! All students are now starting fresh.")
