def app(environ, start_response):
    import os
    from pathlib import Path
    
    root = Path(__file__).resolve().parent
    backend = root / "backend"
    
    res = {
        "bridge_alive": True,
        "root_files": os.listdir(root),
        "backend_exists": backend.exists(),
        "backend_files": os.listdir(backend) if backend.exists() else "NONE"
    }
    
    import json
    start_response('200 OK', [('Content-Type', 'application/json')])
    return [json.dumps(res, indent=2).encode('utf-8')]

