from rest_framework_mongoengine import serializers
from .models import Student, ViolationReport, ETicket, TimeLog, SystemUser, utc_now

class StudentSerializer(serializers.DocumentSerializer):
    class Meta:
        model = Student
        # Never send the password (hash) to any client; it's only set through the password actions
        exclude = ('password',)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        return data

class ViolationReportSerializer(serializers.DocumentSerializer):
    student_details = StudentSerializer(source='student', read_only=True)
    class Meta:
        model = ViolationReport
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        return data

class ETicketSerializer(serializers.DocumentSerializer):
    class Meta:
        model = ETicket
        fields = '__all__'
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # 1. Map ID properly
        data['id'] = str(instance.id)
        if hasattr(instance, 'violation') and instance.violation:
            data['violation'] = str(instance.violation.id)

        # 2. Dynamic Hour Calculation
        # base_remaining_hours + active_time_in let web and mobile compute the same live countdown
        data['base_remaining_hours'] = instance.remaining_hours
        # 3-day deadline (core/deadlines.py): end of the last day, and hours added for missed days
        if instance.created_at:
            from core.deadlines import deadline_end, DAYS_TO_FINISH
            data['deadline'] = deadline_end(instance).isoformat() + 'Z'
            data['days_to_finish'] = DAYS_TO_FINISH
        data['added_hours'] = instance.added_hours or 0
        data['active_time_in'] = None
        data['station'] = {'lat': instance.lat, 'lng': instance.lng, 'radius': instance.radius, 'site_code': getattr(instance, 'site_code', None)}
        from core.views import _assigned_site_code
        assigned_code = _assigned_site_code(instance)
        data['assigned_site'] = {'site_code': assigned_code, 'name': instance.assigned_location} if assigned_code else None
        if instance.status == 'Ongoing':
            try:
                open_log = TimeLog.objects.filter(eticket=instance, time_out=None).first()
                if open_log and open_log.time_in:
                    data['active_time_in'] = open_log.time_in.isoformat()
                    elapsed = (utc_now() - open_log.time_in).total_seconds() / 3600
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
                    # For the e-ticket receipt (student and admin)
                    'offense_count': v_ref.offense_count,
                    'reporting_guard': v_ref.reporting_guard,
                    'created_at': (v_ref.created_at.isoformat() + 'Z') if v_ref.created_at else None,
                    'assigned_building': v_ref.assigned_building,
                    'building_history': v_ref.building_history or [],
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
        # The ticket is sent as its id (below): loading each log's ticket took one query per log
        exclude = ('eticket', 'photo_proof_in', 'photo_proof_out')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        ref = instance.to_mongo().get('eticket')
        data['eticket'] = str(getattr(ref, 'id', ref)) if ref else None
        return data

class SystemUserSerializer(serializers.DocumentSerializer):
    class Meta:
        model = SystemUser
        fields = ['username', 'password', 'role', 'full_name', 'bio']
        extra_kwargs = {
            'password': {'write_only': True}
        }
