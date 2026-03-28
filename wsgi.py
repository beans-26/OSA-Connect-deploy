import os
import sys
from pathlib import Path

# Vercel entry point in root
root = Path(__file__).resolve().parent
backend_root = root / "backend"

if str(backend_root) not in sys.path:
    sys.path.append(str(backend_root))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')

from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
application = app
