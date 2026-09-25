from django.urls import path, include
from rest_framework_mongoengine import routers
from .views import StudentViewSet, ViolationViewSet, ETicketViewSet, TimeLogViewSet, SystemUserViewSet, login_view, health_check
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
    path('health/', health_check, name='health'),
]
