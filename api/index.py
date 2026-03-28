import os
import json

def handler(request):
    """Minimal Vercel handler"""
    return {
        'statusCode': 200,
        'body': json.dumps({'status': 'ok', 'message': 'Hello from Python!'}),
        'headers': {'Content-Type': 'application/json'}
    }

app = handler
