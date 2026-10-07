from django.urls import path, include
from rest_framework_mongoengine import routers
from .views import (StudentViewSet, ViolationViewSet, ETicketViewSet, TimeLogViewSet, SystemUserViewSet, login_view,
                    health_check, clearance_capture, faculty_verify_request, faculty_verify_confirm, faculty_report,
                    faculty_signup_request, faculty_signup, faculty_invite, faculty_accounts, faculty_account_decision,
                    faculty_email_decision, faculty_student_lookup, faculty_reset_request, faculty_reset_password,
                    admin_alerts)
from . import site_views

router = routers.DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'violations', ViolationViewSet, basename='violation')
router.register(r'etickets', ETicketViewSet, basename='eticket')
router.register(r'timelogs', TimeLogViewSet, basename='timelog')
router.register(r'users', SystemUserViewSet, basename='user')

urlpatterns = [
    # Service sites (Admin Settings > Service Sites)
    path('admin/sites/', site_views.sites, name='admin-sites'),
    path('admin/sites/suggest-code/', site_views.suggest_site_code, name='admin-sites-suggest-code'),
    path('admin/sites/<str:site_id>/', site_views.site_detail, name='admin-site-detail'),
    path('admin/sites/<str:site_id>/location/', site_views.site_location, name='admin-site-location'),
    path('admin/sites/<str:site_id>/qr/', site_views.site_qr, name='admin-site-qr'),
    path('', include(router.urls)),
    path('login/', login_view, name='login'),
    # Faculty report without an account: confirm the USTP email with a code, then send the report
    path('faculty/verify/request/', faculty_verify_request, name='faculty-verify-request'),
    path('faculty/verify/confirm/', faculty_verify_confirm, name='faculty-verify-confirm'),
    path('faculty/report/', faculty_report, name='faculty-report'),
    path('faculty/student/<str:student_id>/', faculty_student_lookup, name='faculty-student'),
    # Or make a faculty account (USTP email confirmed with a code) and log in at /faculty
    path('faculty/signup/request/', faculty_signup_request, name='faculty-signup-request'),
    path('faculty/signup/', faculty_signup, name='faculty-signup'),
    path('faculty/invite/', faculty_invite, name='faculty-invite'),
    path('faculty/password-reset/request/', faculty_reset_request, name='faculty-reset-request'),
    path('faculty/password-reset/', faculty_reset_password, name='faculty-reset'),
    # OSA confirms faculty: sign-ups waiting to be activated, and emails faculty reported with
    path('admin/faculty/', faculty_accounts, name='admin-faculty'),
    path('admin/faculty/email/', faculty_email_decision, name='admin-faculty-email'),
    path('admin/faculty/<str:username>/decision/', faculty_account_decision, name='admin-faculty-decision'),
    path('admin/alerts/', admin_alerts, name='admin-alerts'),
    path('capture/<str:token>/', clearance_capture, name='clearance-capture'),
    path('health/', health_check, name='health'),
]
