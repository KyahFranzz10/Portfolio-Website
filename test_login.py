import json
import urllib.request
import urllib.error

url = 'http://localhost:3000/api/login'

payload = {
    "username": "admin",
    "password": "admin123"
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, method='POST')
req.add_header('Content-Type', 'application/json')

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Body:", response.read().decode('utf-8'))
        print("Headers:", response.headers)
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Error Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Connection Error:", str(e))
