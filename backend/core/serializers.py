from rest_framework_mongoengine import serializers
from .models import Student, ViolationReport, ETicket, TimeLog, SystemUser
from datetime import datetime

class StudentSerializer(serializers.DocumentSerializer):
    class Meta:
        model = Student
        fields = '__all__'

class ViolationReportSerializer(serializers.DocumentSerializer):
    student_details = StudentSerializer(source='student', read_only=True)
    class Meta:
        model = ViolationReport
        fields = '__all__'

class ETicketSerializer(serializers.DocumentSerializer):
    class Meta:
        model = ETicket
        fields = '__all__'
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Dynamically calculate remaining hours for ongoing tickets
        if instance.status == 'Ongoing':
            try:
                open_log = TimeLog.objects.filter(eticket=instance, time_out=None).first()
                if open_log and open_log.time_in:
                    elapsed_seconds = (datetime.now() - open_log.time_in).total_seconds()
                    elapsed_hours = elapsed_seconds / 3600
                    # Use current remaining_hours as base, not total_hours_required
                    data['remaining_hours'] = max(0, instance.remaining_hours - elapsed_hours)
            except Exception:
                pass
        # Try to get violation details, but handle missing references gracefully
        try:
            if instance.violation:
                violation = instance.violation
                data['violation_details'] = {
                    'id': str(violation.id),
                    'violation_type': violation.violation_type,
                    'status': violation.status,
                    'punishment': violation.punishment,
                    'student_details': {
                        'id': str(violation.student.id),
                        'student_id': violation.student.student_id,
                        'name': violation.student.name,
                        'course': violation.student.course,
                        'department': violation.student.department,
                    } if violation.student else None
                }
        except Exception:
            data['violation_details'] = None
        return data

class TimeLogSerializer(serializers.DocumentSerializer):
    class Meta:
        model = TimeLog
        fields = '__all__'

class SystemUserSerializer(serializers.DocumentSerializer):
    class Meta:
        model = SystemUser
        fields = ['username', 'password', 'role', 'full_name', 'bio']
        extra_kwargs = {
            'password': {'write_only': True}
        }
