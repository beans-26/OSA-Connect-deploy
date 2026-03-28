import os
import sys
from pathlib import Path

def handler(request):
    root = Path(__file__).resolve().parent.parent
    backend = root / "backend"
    files = [str(p.name) for p in root.iterdir()]
    backend_files = [str(p.name) for p in backend.iterdir()] if backend.exists() else ["NONE"]
    
    return {
        "statusCode": 200,
        "body": {
            "root_exists": root.exists(),
            "root_files": files,
            "backend_exists": backend.exists(),
            "backend_files": backend_files,
            "sys_path": sys.path[:5]
        }
    }
