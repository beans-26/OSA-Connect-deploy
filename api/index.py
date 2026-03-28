import os
import sys
from pathlib import Path

# Add the backend directory to sys.path
# Vercel structure: /api/index.py
# Backend root is at: /backend/
backend_root = Path(__file__).resolve().parent.parent / "backend"
if str(backend_root) not in sys.path:
    sys.path.append(str(backend_root))

try:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
    from django.core.wsgi import get_wsgi_application
    app = get_wsgi_application()
except Exception as e:
    import traceback
    error_msg = traceback.format_exc()
    # Simple direct handler for Vercel if Django fails to load
    def app(environ, start_response):
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [f"DJANGO STARTUP ERROR:\n{error_msg}".encode('utf-8')]
