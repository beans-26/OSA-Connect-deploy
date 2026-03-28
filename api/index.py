import os
import sys
import json
from pathlib import Path

# Add the backend directory to sys.path
backend_root = Path(__file__).resolve().parent.parent / "backend"
if str(backend_root) not in sys.path:
    sys.path.append(str(backend_root))

def handler(request):
    """Vercel serverless function handler"""
    path = request.get('path', '/')
    method = request.get('method', 'GET')
    headers = request.get('headers', {})
    body = request.get('body', '') or ''
    
    # Health check - no Django needed
    if '/health' in path:
        return {
            'statusCode': 200,
            'body': json.dumps({'status': 'ok', 'message': 'Python handler working'}),
            'headers': {'Content-Type': 'application/json'}
        }
    
    # Debug - check env
    if '/debug' in path:
        return {
            'statusCode': 200,
            'body': json.dumps({
                'MONGODB_URI_set': bool(os.getenv('MONGODB_URI')),
                'MONGODB_URI_preview': str(os.getenv('MONGODB_URI', 'NOT SET'))[:50],
                'path': path
            }),
            'headers': {'Content-Type': 'application/json'}
        }
    
    # Login endpoint
    if '/login' in path:
        if method == 'POST':
            try:
                # Load Django here (deferred until first request)
                os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
                import django
                django.setup()
                
                data = json.loads(body) if body else {}
                username = data.get('username', '').lower().strip()
                password = data.get('password', '')
                
                from core.models import SystemUser, Student
                
                # Auto-seed if empty
                if SystemUser.objects.count() == 0:
                    SystemUser(username="admin", password="admin", role="admin", full_name="System Admin").save()
                    SystemUser(username="staff", password="staff", role="staff", full_name="OSA Staff").save()
                    SystemUser(username="guard", password="guard", role="guard", full_name="Gate Guard").save()
                    SystemUser(username="faculty", password="faculty", role="faculty", full_name="Faculty").save()
                
                # Check SystemUser
                try:
                    user = SystemUser.objects.get(username=username)
                    if user.password == password:
                        return {
                            'statusCode': 200,
                            'body': json.dumps({
                                'success': True,
                                'role': user.role,
                                'username': user.username,
                                'full_name': user.full_name
                            }),
                            'headers': {'Content-Type': 'application/json'}
                        }
                    else:
                        return {
                            'statusCode': 401,
                            'body': json.dumps({'error': 'Invalid credentials'}),
                            'headers': {'Content-Type': 'application/json'}
                        }
                except SystemUser.DoesNotExist:
                    pass
                
                # Check Student
                try:
                    student = Student.objects.get(student_id=username)
                    if student.student_id == password or password == student.student_id:
                        return {
                            'statusCode': 200,
                            'body': json.dumps({
                                'success': True,
                                'role': 'student',
                                'username': student.student_id,
                                'name': student.name
                            }),
                            'headers': {'Content-Type': 'application/json'}
                        }
                except Student.DoesNotExist:
                    pass
                
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': 'User not found'}),
                    'headers': {'Content-Type': 'application/json'}
                }
                
            except Exception as e:
                import traceback
                return {
                    'statusCode': 500,
                    'body': json.dumps({'error': str(e), 'trace': traceback.format_exc()}),
                    'headers': {'Content-Type': 'application/json'}
                }
    
    return {
        'statusCode': 404,
        'body': json.dumps({'error': 'Not found', 'path': path}),
        'headers': {'Content-Type': 'application/json'}
    }

# Vercel expects 'app' or 'handler'
app = handler
