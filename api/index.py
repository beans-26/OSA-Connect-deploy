import os
import json

def handler(request, context):
    """Vercel Python handler with MongoDB login"""
    path = request.get('path', '/')
    method = request.get('method', 'GET')
    body = request.get('body', '') or ''
    
    # Health check
    if '/health' in path:
        return {
            'statusCode': 200,
            'body': json.dumps({'status': 'ok'}),
            'headers': {'Content-Type': 'application/json'}
        }
    
    # Debug - check environment
    if '/debug' in path:
        return {
            'statusCode': 200,
            'body': json.dumps({
                'MONGODB_URI_set': bool(os.getenv('MONGODB_URI')),
            }),
            'headers': {'Content-Type': 'application/json'}
        }
    
    # Login endpoint
    if '/login' in path and method == 'POST':
        try:
            mongo_uri = os.getenv('MONGODB_URI')
            
            if not mongo_uri:
                return {
                    'statusCode': 500,
                    'body': json.dumps({'error': 'MONGODB_URI not configured'}),
                    'headers': {'Content-Type': 'application/json'}
                }
            
            # Connect to MongoDB
            from pymongo import MongoClient
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            db = client.get_default_database() or client['OSAConnect_deploymenttest']
            
            # Parse login data
            data = json.loads(body) if body else {}
            username = data.get('username', '').lower().strip()
            password = data.get('password', '')
            
            # Auto-seed if empty
            system_users = db['system_users']
            if system_users.count_documents({}) == 0:
                system_users.insert_many([
                    {'username': 'admin', 'password': 'admin', 'role': 'admin', 'full_name': 'System Admin'},
                    {'username': 'staff', 'password': 'staff', 'role': 'staff', 'full_name': 'OSA Staff'},
                    {'username': 'guard', 'password': 'guard', 'role': 'guard', 'full_name': 'Gate Guard'},
                    {'username': 'faculty', 'password': 'faculty', 'role': 'faculty', 'full_name': 'Faculty'},
                ])
            
            # Check SystemUser
            user = system_users.find_one({'username': username})
            if user:
                if user.get('password') == password:
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
                else:
                    return {
                        'statusCode': 401,
                        'body': json.dumps({'error': 'Invalid credentials'}),
                        'headers': {'Content-Type': 'application/json'}
                    }
            
            # Check Student
            students = db['students']
            student = students.find_one({'student_id': username})
            if student:
                if student.get('student_id') == password or password == student.get('student_id'):
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
                'statusCode': 404,
                'body': json.dumps({'error': 'User not found'}),
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
