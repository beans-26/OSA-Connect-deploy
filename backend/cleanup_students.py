import os
import django

# Set up Django environment
import sys
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student, ViolationReport, ETicket

def cleanup_duplicates():
    print("--- STARTING DATABASE CLEANUP ---")
    
    # 0. STRIP all IDs first (find hidden tabs/spaces)
    print("Normalizing all student IDs (stripping whitespace)...")
    for s in Student.objects.all():
        if s.student_id:
            orig = s.student_id
            stripped = orig.strip()
            if orig != stripped:
                print(f"  Formatting issue detected for {s.name}: [{orig}] -> [{stripped}]")
                
                # Check if the target stripped ID already exists
                conflict = Student.objects.filter(student_id=stripped).first()
                if conflict:
                    print(f"    CONFLICT: Record exists for [{stripped}]. Merging logs...")
                    # RE-LINK ViolationReports from ghost to conflict
                    reports = ViolationReport.objects.filter(student=s)
                    for r in reports:
                        r.student = conflict
                        r.save()
                    s.delete()
                    print(f"    Ghost purged and merged into primary record.")
                else:
                    s.student_id = stripped
                    s.save()
                    print(f"    ID normalized successfully.")

    # 1. Identity all student IDs
    all_sids = [s[0] for s in Student.objects.values_list('student_id')]
    unique_sids = set(all_sids)
    
    for sid in unique_sids:
        if not sid: continue
        duplicates = Student.objects.filter(student_id=sid)
        if duplicates.count() > 1:
            print(f"FOUND DUPLICATE ID: {sid} ({duplicates.count()} entries)")
            
            # Sort duplicates: keep the one with more data (e.g. year_level != 'N/A')
            # and latest update
            sorted_dupes = sorted(
                duplicates, 
                key=lambda s: (s.year_level != 'N/A', s.year_level != None, s.id), 
                reverse=True
            )
            
            keep_this = sorted_dupes[0]
            delete_these = sorted_dupes[1:]
            
            print(f"  KEEPING: {keep_this.name} ({keep_this.year_level}) - ID: {keep_this.id}")
            
            for ghost in delete_these:
                print(f"  CLEANING GHOST ID: {ghost.id}")
                
                # RE-LINK ViolationReports
                reports = ViolationReport.objects.filter(student=ghost)
                if reports.count() > 0:
                    print(f"    Re-linking {reports.count()} reports to primary record...")
                    for r in reports:
                        r.student = keep_this
                        r.save()
                
                # Delete the ghost
                ghost.delete()
                print(f"    Ghost student purged successfully.")

    print("--- CLEANUP COMPLETE ---")

if __name__ == "__main__":
    cleanup_duplicates()
