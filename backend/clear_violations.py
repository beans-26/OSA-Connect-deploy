import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import ViolationReport, ETicket, TimeLog

def clear_violations():
    print("Clearing all Violations, ETickets, and TimeLogs...")
    
    # Delete related items first to avoid any issues
    TimeLog.objects.all().delete()
    ETicket.objects.all().delete()
    ViolationReport.objects.all().delete()
    
    print("Complete! All violation data has been removed.")

if __name__ == "__main__":
    clear_violations()
