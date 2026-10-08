import datetime
from rest_framework_mongoengine import serializers
from .models import Student, ViolationReport, ETicket, TimeLog, SystemUser, utc_now, display_student_name, student_name_parts, faculty_reporter_status, report_reporter_role

class StudentSerializer(serializers.DocumentSerializer):
    class Meta:
        model = Student
        # Never send the password (hash) to any client; it's only set through the password actions
        exclude = ('password',)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        # False for a record made from a report before the student registered (no password yet)
        data['has_account'] = bool(instance.password)
        # Shown on the pages: "Juan D. Dela Cruz" (the middle name as an initial), and its parts
        first, initial, last = student_name_parts(instance)
        data['display_name'] = display_student_name(instance)
        data['name_parts'] = {'first': first, 'middle_initial': initial, 'last': last}
        return data

class ViolationReportSerializer(serializers.DocumentSerializer):
    student_details = StudentSerializer(source='student', read_only=True)
    class Meta:
        model = ViolationReport
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        # Filed by a faculty member OSA hasn't confirmed ('unconfirmed': no Approve/Dismiss until OSA decides)
        # or rejected; None otherwise
        data['reporter_status'] = faculty_reporter_status(instance.reporting_email) if instance.reporting_email else None
        # Who filed it, for "Reported by guard / faculty / OSA"
        data['reporter_role'] = report_reporter_role(instance)
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
        # Lists pass these in, loaded once for all tickets (views.ticket_list_extras); one ticket looks them up
        extras = self.context.get('ticket_extras')
        # When the hours were finished (student notifications). Tickets from before completed_at existed:
        # the end of their last session; only looked up for tickets waiting for clearance.
        done_at = instance.completed_at
        if not done_at and instance.status == 'Completed':
            if extras is not None:
                done_at = extras['last_out'].get(instance.id)
            else:
                last = TimeLog.objects(eticket=instance, time_out__ne=None).order_by('-time_out').only('time_out').first()
                done_at = last.time_out if last else None
        data['completed_at'] = (done_at.isoformat() + 'Z') if done_at else None
        # For the student's "you haven't served today" reminder: only open tickets need the lookup
        if instance.status == 'Active':
            if extras is not None:
                data['served_today'] = instance.id in extras['served_today']
            else:
                from core.deadlines import _utc_midnight, PH
                today_start = _utc_midnight(utc_now().replace(tzinfo=datetime.timezone.utc).astimezone(PH).date())
                data['served_today'] = TimeLog.objects(eticket=instance, time_in__gte=today_start).count() > 0
        else:
            data['served_today'] = instance.status == 'Ongoing'
        data['active_time_in'] = None
        data['station'] = {'lat': instance.lat, 'lng': instance.lng, 'radius': instance.radius, 'site_code': getattr(instance, 'site_code', None)}
        from core.views import _assigned_site_code
        assigned_code = _assigned_site_code(instance, extras['sites'] if extras is not None else None)
        data['assigned_site'] = {'site_code': assigned_code, 'name': instance.assigned_location} if assigned_code else None
        if instance.status == 'Ongoing':
            try:
                if extras is not None:
                    open_log = extras['open_since'].get(instance.id) or {}
                else:
                    log = TimeLog.objects.filter(eticket=instance, time_out=None).only('time_in', 'paused_seconds', 'outside_since').first()
                    open_log = {'time_in': log.time_in, 'paused_seconds': log.paused_seconds, 'outside_since': log.outside_since} if log else {}
                time_in = open_log.get('time_in')
                if time_in:
                    now = utc_now()
                    # Time outside the site pauses the timer: earlier trips plus the one going on now
                    outside_since = open_log.get('outside_since')
                    paused = (open_log.get('paused_seconds') or 0) + (
                        (now - outside_since).total_seconds() if outside_since and now > outside_since else 0)
                    data['active_time_in'] = time_in.isoformat()
                    data['active_paused_seconds'] = round(paused)
                    data['active_outside'] = bool(outside_since)
                    elapsed = max(0, (now - time_in).total_seconds() - paused) / 3600
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
                    'reporter_role': report_reporter_role(v_ref),
                    'created_at': (v_ref.created_at.isoformat() + 'Z') if v_ref.created_at else None,
                    'assigned_building': v_ref.assigned_building,
                    'building_history': v_ref.building_history or [],
                    'cleared_at': (v_ref.cleared_at.isoformat() + 'Z') if v_ref.cleared_at else None,
                    'student_details': {
                        'student_id': s_ref.student_id if s_ref else "Unknown",
                        'name': s_ref.name if s_ref else "Unknown",
                        'display_name': display_student_name(s_ref) if s_ref else "Unknown",
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
