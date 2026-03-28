from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('api/', include('core.urls')),
    # Serve index.html as root and for any other non-API path
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]
