import json

def handler(request, context):
    """Minimal Vercel Python handler"""
    path = request.get('path', '/')
    method = request.get('method', 'GET')
    
    # Health check
    if 'health' in path.lower():
        return {
            'statusCode': 200,
            'body': '{"status": "ok"}',
            'headers': {'Content-Type': 'application/json'}
        }
    
    # Login endpoint
    if 'login' in path.lower() and method == 'POST':
        body = request.get('body', '') or '{}'
        try:
            data = json.loads(body)
            username = data.get('username', '').lower()
            password = data.get('password', '')
            
            # Hardcoded credentials
            if username == 'admin' and password == 'admin':
                return {
                    'statusCode': 200,
                    'body': '{"success": true, "role": "admin", "username": "admin", "full_name": "System Admin"}',
                    'headers': {'Content-Type': 'application/json'}
                }
            elif username == 'faculty' and password == 'faculty':
                return {
                    'statusCode': 200,
                    'body': '{"success": true, "role": "faculty", "username": "faculty", "full_name": "Faculty Member"}',
                    'headers': {'Content-Type': 'application/json'}
                }
            elif username == 'guard' and password == 'guard':
                return {
                    'statusCode': 200,
                    'body': '{"success": true, "role": "guard", "username": "guard", "full_name": "Gate Guard"}',
                    'headers': {'Content-Type': 'application/json'}
                }
            elif username == 'staff' and password == 'staff':
                return {
                    'statusCode': 200,
                    'body': '{"success": true, "role": "staff", "username": "staff", "full_name": "OSA Staff"}',
                    'headers': {'Content-Type': 'application/json'}
                }
            else:
                return {
                    'statusCode': 401,
                    'body': '{"error": "Invalid credentials"}',
                    'headers': {'Content-Type': 'application/json'}
                }
        except Exception as e:
            return {
                'statusCode': 500,
                'body': f'{{"error": "{str(e)}"}}',
                'headers': {'Content-Type': 'application/json'}
            }
    
    return {
        'statusCode': 404,
        'body': '{"error": "Not found"}',
        'headers': {'Content-Type': 'application/json'}
    }

app = handler
