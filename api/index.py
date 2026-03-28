import json

def handler(request, context):
    """Vercel Python handler with context parameter"""
    return {
        'statusCode': 200,
        'body': json.dumps({'status': 'ok', 'message': 'Hello from Python!'}),
        'headers': {'Content-Type': 'application/json'}
    }

app = handler
