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
        
        # 1. Map ID properly
        data['id'] = str(instance.id)

        # 2. Dynamic Hour Calculation
        if instance.status == 'Ongoing':
            try:
                from core.models import TimeLog
                from datetime import datetime
                open_log = TimeLog.objects.filter(eticket=instance, time_out=None).first()
                if open_log and open_log.time_in:
                    elapsed = (datetime.now() - open_log.time_in).total_seconds() / 3600
                    data['remaining_hours'] = max(0, instance.remaining_hours - elapsed)
            except: pass

        # 3. Violation Details Mapping (Manual Dereference)
        try:
            v_ref = instance.violation
            if v_ref:
                # Ensure we have the full document if it's a lazy reference
                if hasattr(v_ref, '_get_current_object'):
                    v_ref = v_ref._get_current_object()
                
                s_ref = v_ref.student
                if s_ref and hasattr(s_ref, '_get_current_object'):
                    s_ref = s_ref._get_current_object()

                data['violation_details'] = {
                    'id': str(v_ref.id),
                    'violation_type': v_ref.violation_type,
                    'status': v_ref.status,
                    'punishment': v_ref.punishment,
                    'student_details': {
                        'student_id': s_ref.student_id if s_ref else "Unknown",
                        'name': s_ref.name if s_ref else "Unknown",
                        'id': str(s_ref.id) if s_ref else "Unknown"
                    }
                }
        except Exception as e:
            print(f"SERIALIZER ERROR: {str(e)}")
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
