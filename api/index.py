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

from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
