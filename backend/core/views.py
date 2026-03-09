from rest_framework_mongoengine import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import Student, ViolationReport, ETicket, TimeLog, SystemUser
from .serializers import StudentSerializer, ViolationReportSerializer, ETicketSerializer, TimeLogSerializer
import datetime

import os



@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate user against SystemUser or Student collection"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({"error": "Username and password required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # First check SystemUser (admin, guard, staff)
    try:
        # AUTO-SEED PROTECTION: If DB is empty, create admin so they can log in
        from core.models import Student
        if SystemUser.objects.count() == 0:
            print("LOGIN: Empty DB detected, auto-seeding...")
            SystemUser(username="admin", password="admin", role="admin", full_name="System Admin").save()
            SystemUser(username="guard", password="guard", role="guard", full_name="Gate Guard").save()
            # Add initial students for the live environment
            initial_students = [
                {"id": "2023303188", "name": "Vincent Dagaraga", "contact": "09358541420", "email": "vinsdagaraga@gmail.com"},
                {"id": "2023303189", "name": "Mark Tajeros", "contact": "09358731470", "email": "marktajeros@gmail.com"},
                {"id": "2023303199", "name": "Nyko Quezon", "contact": "09356782310", "email": "nykoquezon@gmail.com"},
                {"id": "2023303179", "name": "Christian James Ambongan", "contact": "09356730509", "email": "cjambongan@gmail.com"},
                {"id": "2023303178", "name": "Dominic Wacan", "contact": "09358359302", "email": "dominicwacan@gmail.com"}
            ]
            for s in initial_students:
                # UPSERT: Find existing or create new
                student = Student.objects.filter(student_id=s["id"]).first()
                if not student:
                    student = Student(student_id=s["id"])
                
                # Always update fields to match latest seed data
                student.name = s["name"]
                student.course = "BSIT"
                student.department = "CITC"
                student.contact_number = s.get("contact", "")
                student.email = s.get("email", "")
                student.save()

        user = SystemUser.objects.get(username=username)
        if user.password == password:
            return Response({
                "success": True,
                "role": user.role,
                "username": user.username,
                "full_name": user.full_name,
                "bio": user.bio
            })
        else:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    except SystemUser.DoesNotExist:
        pass
    
    # Then check Student collection
    try:
        student = Student.objects.get(student_id=username)
        # For students, use a simple password check (in production, use proper hashing)
        if student.student_id == password or password == student.student_id:
            return Response({
                "success": True,
                "role": "student",
                "username": student.student_id,
                "student_id": student.student_id,
                "name": student.name
            })
        else:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    except Student.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class StudentViewSet(viewsets.ModelViewSet):
    lookup_field = 'student_id'
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [AllowAny]

    def update(self, request, *args, **kwargs):
        try:
            student = self.get_object()
            data = request.data
            
            # Manually update fields to bypass DRF Mongoengine unique validation bug on custom lookup field
            student.name = data.get('name', student.name)
            student.course = data.get('course', student.course)
            student.department = data.get('department', student.department)
            student.year_level = data.get('year_level', student.year_level)
            student.email = data.get('email', student.email)
            student.contact_number = data.get('contact_number', student.contact_number)
            
            new_student_id = data.get('student_id')
            if new_student_id and new_student_id != student.student_id:
                if Student.objects.filter(student_id=new_student_id).first():
                    return Response({"error": "Student ID already exists."}, status=status.HTTP_400_BAD_REQUEST)
                student.student_id = new_student_id
                
            student.save()
            serializer = self.get_serializer(student)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

PUNISHMENT_SYSTEM = {
    "No ID": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "Improper wearing of ID": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "Dress code violation": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "Littering": {
        1: {"punishment": "2 hours campus cleaning", "hours": 2},
        2: {"punishment": "4 hours community service", "hours": 4},
    },
    "Disrespect to staff": {
        1: {"punishment": "8 hours community service", "hours": 8},
        2: {"punishment": "1 to 2 days community service", "hours": 16},
    },
    "Public disturbance": {
        1: {"punishment": "6 hours community service", "hours": 6},
    },
    "Unauthorized use of facilities": {
        1: {"punishment": "1 day community service + payment for damages if needed", "hours": 8},
    },
    "Cheating": {
        1: {"punishment": "2 to 3 days community service + academic sanction from instructor", "hours": 20},
    },
    "Forgery of signature": {
        1: {"punishment": "2 to 5 days community service + possible disciplinary hearing", "hours": 32},
    },
    "Vandalism": {
        1: {"punishment": "3 to 5 days community service + payment for damages", "hours": 32},
    },
    "Smoking inside campus": {
        1: {"punishment": "1 day community service + seminar on campus rules", "hours": 8},
    },
    "Serious misconduct": {
        1: {"punishment": "Disciplinary hearing + possible suspension", "hours": 0},
    },
}

def get_offense_count(student, violation_type):
    """Count how many times this student has committed this violation type"""
    count = ViolationReport.objects.filter(
        student=student,
        violation_type=violation_type
    ).count()
    return count + 1  # +1 because this is the current offense

def get_punishment(violation_type, offense_count):
    """Get the punishment based on violation type and offense count"""
    if violation_type in PUNISHMENT_SYSTEM:
        violation_punishments = PUNISHMENT_SYSTEM[violation_type]
        if offense_count in violation_punishments:
            return violation_punishments[offense_count]
        # If offense count exceeds defined punishments, use the last one
        return list(violation_punishments.values())[-1]
    # Default punishment for undefined violations
    return {"punishment": "To be determined", "hours": 4}

class ViolationViewSet(viewsets.ModelViewSet):
    queryset = ViolationReport.objects.all()
    serializer_class = ViolationReportSerializer
    permission_classes = [AllowAny]


    @action(detail=False, methods=['get'])
    def analytics(self, request):
        from collections import Counter
        all_violations = ViolationReport.objects.all()
        counts = Counter(v.violation_type for v in all_violations)
        sorted_data = sorted(
            [{"violation_type": k, "count": v} for k, v in counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )
        return Response(sorted_data)
    def create(self, request, *args, **kwargs):
        data = request.data
        print(f"--- DATABASE SYNC: PREPARING VIOLATION REPORT ---")
        print(f"Payload: {data}")
        
        student_id = data.get('student_id')
        if not student_id:
            # Fallback for old field name just in case
            student_id = data.get('studentId')
            
        if not student_id:
            return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. ORM: Find or Create Student to ensure link exists
        try:
            student = Student.objects.get(student_id=student_id)
            print(f"DB MATCH: Existing student record found: {student.name}")
        except Student.DoesNotExist:
            print(f"DB SYNC: Creating missing student profile for {student_id}...")
            student = Student(
                student_id=student_id,
                name=data.get('name', 'New Student'),
                course=data.get('course', 'Unknown'),
                department=data.get('department', 'Unknown'),
                contact_number=data.get('contact', ''),
                email=data.get('email', '')
            ).save()
            print(f"DB SUCCESS: New student registered: {student.name}")
            
        # 2. Calculate offense count and punishment
        violation_type = data.get('violation', 'Other')
        offense_count = get_offense_count(student, violation_type)
        punishment_info = get_punishment(violation_type, offense_count)
        
        # All violations now require Pending OSA Review (warnings replaced with community service hours)
        violation_status = "Pending OSA Review"
        notification_type = "action_required"
        
        # 3. ODM: Directly instantiate and save the ViolationReport to 'violation_reports' collection
        try:
            # We save directly using Mongoengine to bypass any potential Serializer mapping issues
            report = ViolationReport(
                student=student,
                violation_type=violation_type,
                description=data.get('description', ''),
                reporting_guard=data.get('reporting_guard', 'Gate Guard'),
                status=violation_status,
                offense_count=offense_count,
                punishment=punishment_info["punishment"],
                created_at=datetime.datetime.now()
            )
            report.save()
            
            print(f"DB SYNC SUCCESS: Violation {report.id} committed to collection 'violation_reports'")
            print(f"Offense #{offense_count} for {violation_type}: {punishment_info['punishment']}")
            
            # 4. Return serialized data so the frontend can update UI
            response_data = self.get_serializer(report).data
            response_data["offense_count"] = offense_count
            response_data["punishment"] = punishment_info["punishment"]
            response_data["notification_type"] = notification_type
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"DB SYNC FAILED: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def approve(self, request, *args, **kwargs):
        try:
            violation_id = kwargs.get('id') or kwargs.get('pk')
            violation = ViolationReport.objects.get(id=violation_id)
            
            if violation.status == "Approved" or violation.status == "Completed":
                return Response({"error": "Violation is already approved or completed."}, status=status.HTTP_400_BAD_REQUEST)

            violation.status = "Approved"
            violation.save()
            
            # Get the actual punishment hours from the violation's offense count
            punishment_info = get_punishment(violation.violation_type, violation.offense_count)
            hours = punishment_info["hours"]
            
            # Only create E-Ticket if there are hours to serve
            if hours > 0:
                violation.status = "Approved"
                violation.save()
                ticket = ETicket(
                    violation=violation,
                    assigned_location="Campus Grounds / Library",
                    total_hours_required=hours,
                    remaining_hours=hours,
                    status="Active"
                ).save()
                print(f"Violation {violation_id} APPROVED. E-Ticket {ticket.id} created with {hours} hours.")
                return Response({"message": f"Violation Approved. E-Ticket created with {hours} hours."}, status=status.HTTP_200_OK)
            
            violation.status = "Completed"
            violation.save()
            print(f"Violation {violation_id} COMPLETED. No E-Ticket needed.")
            return Response({"message": f"Violation Marked as Completed. No service hours required."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def dismiss(self, request, *args, **kwargs):
        try:
            violation_id = kwargs.get('id') or kwargs.get('pk')
            violation = ViolationReport.objects.get(id=violation_id)
            violation.status = "Dismissed"
            violation.save()
            print(f"Violation {violation_id} DISMISSED.")
            return Response({"message": "Violation Dismissed."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ETicketViewSet(viewsets.ModelViewSet):
    queryset = ETicket.objects.all()
    serializer_class = ETicketSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        # Filter out E-Tickets with broken violation references
        valid_tickets = []
        for ticket in ETicket.objects.all():
            try:
                # Try to access the violation to check if it exists
                _ = ticket.violation.violation_type
                valid_tickets.append(ticket.id)
            except Exception:
                # Delete E-Tickets with broken references
                print(f"Deleting E-Ticket {ticket.id} with broken violation reference")
                ticket.delete()
        return ETicket.objects.filter(id__in=valid_tickets)

    @action(detail=False, methods=['post'])
    def manual_time_in(self, request):
        """Admin can manually force time in for a student using a code"""
        student_id = request.data.get('student_id')
        code = request.data.get('code', '').upper()

        valid_codes = ['OSA-START', 'OSA-RESUME', 'OSA-IN']

        if code not in valid_codes:
            return Response({"error": "Invalid code. Use OSA-START to begin service."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Find the student
            student = Student.objects.get(student_id=student_id)

            # Find the student's active ticket
            ticket = None
            for t in ETicket.objects.all():
                try:
                    if t.violation.student.student_id == student_id and t.status in ['Active', 'Ongoing']:
                        ticket = t
                        break
                except:
                    pass

            if not ticket:
                return Response({"error": "No active E-Ticket found for this student"}, status=status.HTTP_404_NOT_FOUND)

            # Check if timer already running
            open_log = TimeLog.objects.filter(eticket=ticket, time_out=None).first()
            if open_log:
                return Response({"error": "Timer already running for this student"}, status=status.HTTP_400_BAD_REQUEST)

            # Close any existing open time logs first
            open_logs = TimeLog.objects.filter(eticket=ticket, time_out=None)
            for log in open_logs:
                log.time_out = datetime.datetime.now()
                duration = (log.time_out - log.time_in).total_seconds()
                log.duration_seconds = duration
                log.save()
                ticket.remaining_hours = max(0, ticket.remaining_hours - (duration / 3600))
                
                if ticket.remaining_hours <= 0.001:
                    ticket.remaining_hours = 0
                    ticket.status = "Completed"
                    ticket.violation.status = "Completed"
                    ticket.violation.save()

            if ticket.remaining_hours > 0:
                # Start timer - use remaining hours from ticket
                ticket.status = "Ongoing"
                ticket.save()
                # Create a new time log
                log = TimeLog(eticket=ticket).save()
            else:
                ticket.save()

            return Response({
                "message": f"Timer started for student {student_id}",
                "remaining_hours": ticket.remaining_hours,
                "status": ticket.status
            })

        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def manual_time_out(self, request):
        """Admin can manually force time out for a student"""
        student_id = request.data.get('student_id')

        try:
            # Find the student
            student = Student.objects.get(student_id=student_id)

            # Find the student's ongoing ticket
            ticket = None
            for t in ETicket.objects.all():
                try:
                    if t.violation.student.student_id == student_id and t.status == 'Ongoing':
                        ticket = t
                        break
                except:
                    pass

            if not ticket:
                return Response({"error": "No active timer found for this student"}, status=status.HTTP_404_NOT_FOUND)

            # Find and close the open time log
            open_log = TimeLog.objects.filter(eticket=ticket, time_out=None).first()
            if open_log:
                open_log.time_out = datetime.datetime.now()
                duration = (open_log.time_out - open_log.time_in).total_seconds()
                open_log.duration_seconds = duration
                open_log.save()

                # Deduct hours
                hours_to_deduct = duration / 3600
                ticket.remaining_hours = max(0, ticket.remaining_hours - hours_to_deduct)
                
                if ticket.remaining_hours <= 0.001:
                    ticket.remaining_hours = 0
                    ticket.status = "Completed"
                    ticket.violation.status = "Completed"
                    ticket.violation.save()
                else:
                    ticket.status = "Active"
                ticket.save()

            return Response({
                "message": f"Timer stopped for student {student_id}",
                "remaining_hours": ticket.remaining_hours,
                "status": ticket.status
            })

        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class TimeLogViewSet(viewsets.ModelViewSet):
    queryset = TimeLog.objects.all()
    serializer_class = TimeLogSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def log_time(self, request):
        eticket_id = request.data.get('eticket_id')
        action_type = request.data.get('action') # 'in' or 'out'
        
        try:
            eticket = ETicket.objects.get(id=eticket_id)
            
            if action_type == 'custom':
                hours = float(request.data.get('deduct_hours', 0))
                eticket.remaining_hours = max(0, eticket.remaining_hours - hours)
                if eticket.remaining_hours <= 0.001:
                    eticket.remaining_hours = 0
                    eticket.status = "Completed"
                    eticket.violation.status = "Completed"
                    eticket.violation.save()
                eticket.save()
                return Response({"message": f"Successfully deducted {hours} hours!"})

            elif action_type == 'set_start':
                hours = float(request.data.get('deduct_hours', 0))
                
                # Close any existing open time logs for this ticket
                open_logs = TimeLog.objects.filter(eticket=eticket, time_out=None)
                for old_log in open_logs:
                    old_log.time_out = datetime.datetime.now()
                    old_log.duration_seconds = 0  # Don't count old partial sessions
                    old_log.save()
                
                # Set remaining hours to EXACTLY the QR code value
                eticket.remaining_hours = hours
                eticket.status = "Ongoing"
                eticket.save()
                
                # Create a fresh time log for this new session
                log = TimeLog(eticket=eticket).save()
                    
                print(f"SET_START: Timer reset to {hours} hours for ticket {eticket.id}")
                return Response({"message": f"Timer started for {hours} hours!", "hours": hours})

            elif action_type == 'in':
                # Check if there's already an active session
                existing_log = TimeLog.objects.filter(eticket=eticket, time_out=None).first()
                if existing_log:
                    # Timer already running, just return the existing log
                    return Response(TimeLogSerializer(existing_log).data)
                
                # Create new session only if none exists
                log = TimeLog(eticket=eticket).save()
                eticket.status = "Ongoing"
                eticket.save()
                return Response(TimeLogSerializer(log).data)
            else:
                log = TimeLog.objects.filter(eticket=eticket, time_out=None).order_by('-time_in').first()
                if log:
                    log.time_out = datetime.datetime.now()
                    duration = (log.time_out - log.time_in).total_seconds()
                    log.duration_seconds = duration
                    log.save()
                    
                    hours_to_deduct = duration / 3600
                    eticket.remaining_hours = max(0, eticket.remaining_hours - hours_to_deduct)
                    if eticket.remaining_hours <= 0.001:
                        eticket.remaining_hours = 0
                        eticket.status = "Completed"
                        eticket.violation.status = "Completed"
                        eticket.violation.save()
                    else:
                        eticket.status = "Active"
                    eticket.save()
                    
                    return Response(TimeLogSerializer(log).data)
                return Response({"error": "No active session"}, status=status.HTTP_400_BAD_REQUEST)
        except ETicket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

from .serializers import SystemUserSerializer

class SystemUserViewSet(viewsets.ModelViewSet):
    queryset = SystemUser.objects.all()
    serializer_class = SystemUserSerializer
    permission_classes = [AllowAny]
    lookup_field = 'username'

    @action(detail=False, methods=['post'])
    def update_profile(self, request):
        username = request.data.get('username')
        full_name = request.data.get('full_name')
        bio = request.data.get('bio')
        
        try:
            user = SystemUser.objects.get(username=username)
            if full_name: user.full_name = full_name
            if bio: user.bio = bio
            user.save()
            return Response({
                "success": True, 
                "full_name": user.full_name, 
                "bio": user.bio
            })
        except SystemUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        username = request.data.get('username')
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        try:
            user = SystemUser.objects.get(username=username)
            if user.password == old_password:
                user.password = new_password
                user.save()
                return Response({"success": True, "message": "Password updated successfully"})
            return Response({"error": "Incorrect old password"}, status=400)
        except SystemUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Check if the backend and database are connected"""
    try:
        # Check if we can reach the database
        user_count = SystemUser.objects.count()
        
        # AUTO-SEED TRIGGER: If live DB is empty, fill it once!
        if user_count == 0:
            print("HEALTH: Empty DB detected, seeding...")
            # Create Default Users
            SystemUser(username="admin", password="admin", role="admin").save()
            SystemUser(username="guard", password="guard", role="guard").save()
            # Create Students
            initial_students = [
                {"id": "2023303188", "name": "Vincent Dagaraga", "contact": "09358541420", "email": "vinsdagaraga@gmail.com"},
                {"id": "2023303189", "name": "Mark Tajeros", "contact": "09358731470", "email": "marktajeros@gmail.com"},
                {"id": "2023303199", "name": "Nyko Quezon", "contact": "09356782310", "email": "nykoquezon@gmail.com"},
                {"id": "2023303179", "name": "Christian James Ambongan", "contact": "09356730509", "email": "cjambongan@gmail.com"},
                {"id": "2023303178", "name": "Dominic Wacan", "contact": "09358359302", "email": "dominicwacan@gmail.com"}
            ]
            for s in initial_students:
                # UPSERT: Find existing or create new
                student = Student.objects.filter(student_id=s["id"]).first()
                if not student:
                    student = Student(student_id=s["id"])
                
                # Always update fields to match latest seed data
                student.name = s["name"]
                student.course = "BSIT"
                student.department = "CITC"
                student.contact_number = s.get("contact", "")
                student.email = s.get("email", "")
                student.save()
            user_count = SystemUser.objects.count()

        return Response({
            "status": "healthy", 
            "database": "connected", 
            "users": user_count,
            "seeding": "Success" if user_count > 0 else "Pending"
        })
    except Exception as e:
        return Response({"status": "error", "message": f"Database check failed: {str(e)}"}, status=500)
