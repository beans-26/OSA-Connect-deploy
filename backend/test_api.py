import urllib.request
import urllib.error
import json

try:
    req = urllib.request.Request(
        'http://localhost:8000/api/timelogs/log_time/', 
        data=json.dumps({"eticket_id": "69a4645bc29d5240bf3de5c1", "action": "in"}).encode('utf-8'),
        method='POST',
        headers={'Content-Type': 'application/json'}
    )
    response = urllib.request.urlopen(req)
    print(response.read().decode())
except urllib.error.HTTPError as e:
    import re
    html = e.read().decode('utf-8')
    m = re.search(r'<pre class="exception_value">(.*?)</pre>', html)
    if m:
        print("EXCEPTION IS:", m.group(1))
    else:
        print("COULD NOT EXTRACT EXCEPTION. HTML START:")
        print(html[:1000])
