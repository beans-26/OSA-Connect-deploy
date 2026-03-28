import os
import json
from pymongo import MongoClient

def handler(request, context):
    """Vercel Python handler with MongoDB login"""
    path = request.get('path', '/')
    method = request.get('method', 'GET')
    body = request.get('body', '') or ''
    
    # Health check
    if 'health' in path.lower():
        return {
            'statusCode': 200,
            'body': json.dumps({'status': 'ok'}),
            'headers': {'Content-Type': 'application/json'}
        }
    
    # Login endpoint
    if 'login' in path.lower() and method == 'POST':
        try:
            data = json.loads(body) if body else {}
            username = data.get('username', '').lower().strip()
            password = data.get('password', '')
            
            # Test credentials (always work)
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
            
            if username == 'faculty' and password == 'faculty':
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'success': True,
                        'role': 'faculty',
                        'username': 'faculty',
                        'full_name': 'Faculty Member'
                    }),
                    'headers': {'Content-Type': 'application/json'}
                }
            
            if username == 'guard' and password == 'guard':
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'success': True,
                        'role': 'guard',
                        'username': 'guard',
                        'full_name': 'Gate Guard'
                    }),
                    'headers': {'Content-Type': 'application/json'}
                }
            
            if username == 'staff' and password == 'staff':
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'success': True,
                        'role': 'staff',
                        'username': 'staff',
                        'full_name': 'OSA Staff'
                    }),
                    'headers': {'Content-Type': 'application/json'}
                }
            
            # Try MongoDB for other users
            mongo_uri = os.getenv('MONGODB_URI')
            if mongo_uri:
                try:
                    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
                    db = client.get_default_database() or client['OSAConnect_deploymenttest']
                    
                    # Check system users
                    user = db['system_users'].find_one({'username': username})
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
                    student = db['students'].find_one({'student_id': username})
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
                except:
                    pass  # MongoDB failed, continue to 401
            
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

app = handler
