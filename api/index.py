import json

def handler(request, context):
    """Vercel Python handler"""
    path = request.get('path', '/')
    method = request.get('method', 'GET')
    
    if 'login' in path and method == 'POST':
        body = request.get('body', '') or '{}'
        try:
            data = json.loads(body)
            username = data.get('username', '').lower()
            password = data.get('password', '')
            
            # Return hardcoded response for testing
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
        'statusCode': 200,
        'body': json.dumps({'status': 'ok', 'path': path}),
        'headers': {'Content-Type': 'application/json'}
    }
