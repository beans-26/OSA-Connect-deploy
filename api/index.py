import os
import sys
import json
from pathlib import Path

# Add the backend directory to sys.path
backend_root = Path(__file__).resolve().parent.parent / "backend"
if str(backend_root) not in sys.path:
    sys.path.append(str(backend_root))

# Load environment variables FIRST
from dotenv import load_dotenv
load_dotenv(backend_root / '.env')

# Print env status for debugging
print(f"[Vercel] MONGODB_URI exists: {bool(os.getenv('MONGODB_URI'))}")
print(f"[Vercel] MONGODB_URI preview: {str(os.getenv('MONGODB_URI', ''))[:30]}...")

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')

# Initialize Django
import django
django.setup()

# Test MongoDB connection
try:
    from core.models import SystemUser
    count = SystemUser.objects.count()
    print(f"[Vercel] MongoDB connected. SystemUser count: {count}")
except Exception as e:
    print(f"[Vercel] MongoDB connection error: {e}")

def handler(request):
    """Vercel serverless function handler"""
    path = request.get('path', '/')
    method = request.get('method', 'GET')
    headers = request.get('headers', {})
    body = request.get('body', '') or ''
    
    print(f"[Vercel] {method} {path}")
    
    try:
        # Strip /api prefix if present
        clean_path = path
        if path.startswith('/api'):
            clean_path = path[4:] if path.startswith('/api/') else path[3:]
        if not clean_path:
            clean_path = '/'
        
        print(f"[Vercel] Clean path: {clean_path}")
        
        # Health check
        if clean_path in ['/health/', '/health', '/']:
            return {
                'statusCode': 200,
                'body': json.dumps({'status': 'ok', 'path': clean_path}),
                'headers': {'Content-Type': 'application/json'}
            }
        
        # Debug - check database
        if clean_path in ['/debug/', '/debug']:
            try:
                from core.models import SystemUser, Student
                users = list(SystemUser.objects.all())
                user_count = SystemUser.objects.count()
                student_count = Student.objects.count()
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'status': 'connected',
                        'system_users': user_count,
                        'users': [{'username': u.username, 'role': u.role} for u in users],
                        'students': student_count,
                        'env_mongodb': bool(os.getenv('MONGODB_URI'))
                    }),
                    'headers': {'Content-Type': 'application/json'}
                }
            except Exception as db_e:
                import traceback
                return {
                    'statusCode': 500,
                    'body': json.dumps({'status': 'db_error', 'error': str(db_e), 'trace': traceback.format_exc()}),
                    'headers': {'Content-Type': 'application/json'}
                }
        
        # Login endpoint
        if clean_path in ['/login/', '/login']:
            if method == 'POST':
                try:
                    data = json.loads(body) if body else {}
                except json.JSONDecodeError:
                    data = {}
                
                username = data.get('username', '').lower().strip()
                password = data.get('password', '')
                
                print(f"[Vercel] Login attempt for: {username}")
                
                if not username or not password:
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'error': 'Username and password required'}),
                        'headers': {'Content-Type': 'application/json'}
                    }
                
                try:
                    from core.models import SystemUser, Student
                    
                    # AUTO-SEED: Create default users if DB is empty
                    if SystemUser.objects.count() == 0:
                        print("[Vercel] Empty DB detected, auto-seeding users...")
                        SystemUser(username="admin", password="admin", role="admin", full_name="System Admin").save()
                        SystemUser(username="staff", password="staff", role="staff", full_name="OSA Staff").save()
                        SystemUser(username="guard", password="guard", role="guard", full_name="Gate Guard").save()
                        SystemUser(username="faculty", password="faculty", role="faculty", full_name="University Faculty").save()
                        # Seed initial students
                        initial_students = [
                            {"id": "2023303188", "name": "Vincent Dagaraga"},
                            {"id": "2023303189", "name": "Mark Tajeros"},
                        ]
                        for s in initial_students:
                            student = Student.objects.filter(student_id=s["id"]).first()
                            if not student:
                                student = Student(student_id=s["id"])
                            student.name = s["name"]
                            student.save()
                        print("[Vercel] Auto-seeding complete")
                    
                    # Check SystemUser first
                    try:
                        user = SystemUser.objects.get(username=username)
                        if user.password == password:
                            print(f"[Vercel] SystemUser login success: {username}")
                            return {
                                'statusCode': 200,
                                'body': json.dumps({
                                    'success': True,
                                    'role': user.role,
                                    'username': user.username,
                                    'full_name': user.full_name,
                                    'bio': user.bio
                                }),
                                'headers': {'Content-Type': 'application/json'}
                            }
                        else:
                            print(f"[Vercel] SystemUser password mismatch: {username}")
                            return {
                                'statusCode': 401,
                                'body': json.dumps({'error': 'Invalid credentials'}),
                                'headers': {'Content-Type': 'application/json'}
                            }
                    except SystemUser.DoesNotExist:
                        pass
                    
                    # Check Student collection
                    try:
                        student = Student.objects.get(student_id=username)
                        if student.student_id == password or password == student.student_id:
                            print(f"[Vercel] Student login success: {username}")
                            return {
                                'statusCode': 200,
                                'body': json.dumps({
                                    'success': True,
                                    'role': 'student',
                                    'username': student.student_id,
                                    'student_id': student.student_id,
                                    'name': student.name
                                }),
                                'headers': {'Content-Type': 'application/json'}
                            }
                        else:
                            print(f"[Vercel] Student password mismatch: {username}")
                            return {
                                'statusCode': 401,
                                'body': json.dumps({'error': 'Invalid credentials'}),
                                'headers': {'Content-Type': 'application/json'}
                            }
                    except Student.DoesNotExist:
                        print(f"[Vercel] User not found: {username}")
                        return {
                            'statusCode': 404,
                            'body': json.dumps({'error': 'User not found'}),
                            'headers': {'Content-Type': 'application/json'}
                        }
                        
                except Exception as db_error:
                    import traceback
                    error_trace = traceback.format_exc()
                    print(f"[Vercel] Database error: {error_trace}")
                    return {
                        'statusCode': 500,
                        'body': json.dumps({'error': 'Database error', 'details': str(db_error)}),
                        'headers': {'Content-Type': 'application/json'}
                    }
            
            return {
                'statusCode': 405,
                'body': json.dumps({'error': 'Method not allowed'}),
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

# Vercel expects 'app' or 'handler' at module level
app = handler
