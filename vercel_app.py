import os
import sys
from pathlib import Path

# Standard Vercel Root Entry Point
# CWD = /var/task/
backend_root = Path(__file__).resolve().parent / "backend"
if str(backend_root) not in sys.path:
    sys.path.append(str(backend_root))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')

try:
    from django.core.wsgi import get_wsgi_application
    app = get_wsgi_application()
    application = app
except Exception as e:
    import traceback
    error_msg = traceback.format_exc()
    # Diagnostic handler if Django fails to start
    def app(environ, start_response):
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [f"ROOT DJANGO ERROR:\n{error_msg}".encode('utf-8')]
    application = app
