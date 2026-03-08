import os
import sys
from pathlib import Path

# Add the backend directory to sys.path so 'osaconnect_backend' can be found
# Vercel structure: /var/task/backend/osaconnect_backend/wsgi.py
file_path = Path(__file__).resolve()
backend_root = file_path.parent.parent # This is /backend/
if str(backend_root) not in sys.path:
    sys.path.append(str(backend_root))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')

try:
    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()
    app = application
except Exception as e:
    print(f"CRITICAL ERROR: {e}")
    raise e
