import os
import json
from pymongo import MongoClient

def handler(request, context):
    """Vercel Python handler"""
    path = request.get('path', '/')
    method = request.get('method', 'GET')
    body = request.get('body', '') or ''
    
    # Health
    if 'health' in path.lower():
        return {
            'statusCode': 200,
            'body': json.dumps({'status': 'ok'}),
            'headers': {'Content-Type': 'application/json'}
        }
    
    # Debug - check env
    if 'debug' in path.lower():
        return {
            'statusCode': 200,
            'body': json.dumps({
                'MONGODB_URI': bool(os.getenv('MONGODB_URI')),
                'path': path
            }),
            'headers': {'Content-Type': 'application/json'}
        }
    
    # Login
    if 'login' in path.lower() and method == 'POST':
        try:
            data = json.loads(body) if body else {}
            username = data.get('username', '').lower().strip()
            password = data.get('password', '')
            
            # Return success for admin/admin (for testing)
            if username == 'admin' and password == 'admin':
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'success': True,
                        'role': 'admin',
                        'username': 'admin',
                        'full_name': 'System Admin'
                    }),
                    'headers': {'Content-Type': 'application/json'}
                }
            
            # Try MongoDB if available
            mongo_uri = os.getenv('MONGODB_URI')
            if mongo_uri:
                client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
                db = client.get_default_database() or client['OSAConnect_deploymenttest']
                users = db['system_users']
                
                # Auto-seed
                if users.count_documents({}) == 0:
                    users.insert_many([
                        {'username': 'admin', 'password': 'admin', 'role': 'admin', 'full_name': 'System Admin'},
                        {'username': 'guard', 'password': 'guard', 'role': 'guard', 'full_name': 'Gate Guard'},
                        {'username': 'faculty', 'password': 'faculty', 'role': 'faculty', 'full_name': 'Faculty'},
                    ])
                
                user = users.find_one({'username': username})
                if user and user.get('password') == password:
                    return {
                        'statusCode': 200,
                        'body': json.dumps({
                            'success': True,
                            'role': user.get('role'),
                            'username': user.get('username'),
                            'full_name': user.get('full_name')
                        }),
                        'headers': {'Content-Type': 'application/json'}
                    }
                
                # Check students
                students = db['students']
                student = students.find_one({'student_id': username})
                if student and (student.get('student_id') == password or password == student.get('student_id')):
                    return {
                        'statusCode': 200,
                        'body': json.dumps({
                            'success': True,
                            'role': 'student',
                            'username': student.get('student_id'),
                            'name': student.get('name')
                        }),
                        'headers': {'Content-Type': 'application/json'}
                    }
            
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Invalid credentials'}),
                'headers': {'Content-Type': 'application/json'}
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': str(e)}),
                'headers': {'Content-Type': 'application/json'}
            }
    
    return {
        'statusCode': 404,
        'body': json.dumps({'error': 'Not found'}),
        'headers': {'Content-Type': 'application/json'}
    }
