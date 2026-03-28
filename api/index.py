import os
import sys
from pathlib import Path

# Add the backend directory to sys.path
backend_root = Path(__file__).resolve().parent.parent / "backend"
if str(backend_root) not in sys.path:
    sys.path.append(str(backend_root))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')

# Load dotenv for environment variables
from dotenv import load_dotenv
load_dotenv(backend_root / '.env')

def app(environ, start_response):
    # Debug logging
    path_info = environ.get('PATH_INFO', '')
    method = environ.get('REQUEST_METHOD', '')
    print(f"[Vercel API] {method} {path_info}")
    
    try:
        from django.core.wsgi import get_wsgi_application
        wsgi_app = get_wsgi_application()
        return wsgi_app(environ, start_response)
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"[Vercel API Error] {error_msg}")
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [f"DJANGO ERROR:\n{error_msg}".encode('utf-8')]
