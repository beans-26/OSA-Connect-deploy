from django.urls import path, include
from rest_framework_mongoengine import routers
from .views import StudentViewSet, ViolationViewSet, ETicketViewSet, TimeLogViewSet, SystemUserViewSet, login_view, health_check

router = routers.DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'violations', ViolationViewSet, basename='violation')
router.register(r'etickets', ETicketViewSet, basename='eticket')
router.register(r'timelogs', TimeLogViewSet, basename='timelog')
router.register(r'users', SystemUserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', login_view, name='login'),
    path('health/', health_check, name='health'),
]
