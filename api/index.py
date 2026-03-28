import os
import sys
from pathlib import Path

# Vercel's absolute API bridge
# ROOT = /var/task/
root = Path(__file__).resolve().parent.parent
backend_root = root / "backend"

# Ensure Django project is in sys.path
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
    def app(environ, start_response):
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [f"API ISOLATION ERROR:\n{error_msg}".encode('utf-8')]
    application = app
