import json
import urllib.request
import base64

url = 'http://localhost:3000/api/upload'

# Create a dummy 1x1 png base64
dummy_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

payload = {
    "filename": "test_image.png",
    "base64_data": "data:image/png;base64," + dummy_png
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, method='POST')
req.add_header('Content-Type', 'application/json')

# Note: This will probably get 401 Unauthorized because we don't have a session_id cookie.
try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Body:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Error Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Connection Error:", str(e))
