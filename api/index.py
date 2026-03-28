import os
import sys
import json
from pathlib import Path

# Add the backend directory to sys.path
backend_root = Path(__file__).resolve().parent.parent / "backend"
if str(backend_root) not in sys.path:
    sys.path.append(str(backend_root))

# Set Django settings and load env
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')

from dotenv import load_dotenv
load_dotenv(backend_root / '.env')

# Initialize Django on module load
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
import django
django.setup()

def handler(request):
    """Vercel serverless function handler"""
    path = request.get('path', '/')
    method = request.get('method', 'GET')
    headers = request.get('headers', {})
    body = request.get('body', '')
    
    print(f"[Vercel] {method} {path}")
    
    try:
        from core.views import login_view, health_check
        
        # Strip /api prefix if present
        clean_path = path
        if path.startswith('/api'):
            clean_path = path[4:] if path.startswith('/api/') else path[3:]
        if not clean_path:
            clean_path = '/'
        
        if clean_path in ['/login/', '/login']:
            if method == 'POST':
                data = json.loads(body) if body else {}
                from rest_framework.test import APIRequestFactory
                factory = APIRequestFactory()
                django_request = factory.post('/login/', data, format='json')
                django_request.META['HTTP_CONTENT_TYPE'] = headers.get('content-type', 'application/json')
                response = login_view(django_request)
                return {
                    'statusCode': response.status_code,
                    'body': json.dumps(response.data),
                    'headers': {'Content-Type': 'application/json'}
                }
        
        if clean_path in ['/health/', '/health']:
            return {
                'statusCode': 200,
                'body': json.dumps({'status': 'ok'}),
                'headers': {'Content-Type': 'application/json'}
            }
        
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Not found', 'path': clean_path}),
            'headers': {'Content-Type': 'application/json'}
        }
        
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"[Vercel Error] {error_msg}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e), 'trace': error_msg}),
            'headers': {'Content-Type': 'application/json'}
        }
