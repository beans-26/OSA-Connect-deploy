import json

def handler(request, context):
    return {
        'statusCode': 200,
        'body': '{"status": "ok", "message": "Hello!"}',
        'headers': {'Content-Type': 'application/json'}
    }
