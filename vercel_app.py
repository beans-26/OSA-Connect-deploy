# ZERO-DEPENDENCY SKELETON BRIDGE
# This is a TEST to confirm Vercel can find the 'app' variable at all.
# If this turns GREEN, it means our pathing for Django was the issue.

def app(environ, start_response):
    status = '200 OK'
    response_headers = [('Content-Type', 'text/plain')]
    start_response(status, response_headers)
    return [b"BRIDGE IS ALIVE. IF YOU SEE THIS, THE PROBLEM IS DJANGO IMPORT PATHS!"]

application = app
# Vercel's Python runtime searches for 'handler', 'app', or 'application'
handler = app
