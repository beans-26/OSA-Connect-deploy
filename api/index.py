import os
import sys
from pathlib import Path

# Add the backend directory to sys.path
# Vercel structure: /api/index.py
# Backend root is at: /backend/
backend_root = Path(__file__).resolve().parent.parent / "backend"
if str(backend_root) not in sys.path:
    sys.path.append(str(backend_root))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')

def app(environ, start_response):
    try:
        from django.core.wsgi import get_wsgi_application
        wsgi_app = get_wsgi_application()
        return wsgi_app(environ, start_response)
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [f"DJANGO ERROR:\n{error_msg}".encode('utf-8')]
