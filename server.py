import http.server
import json
import os
import urllib.parse
import http.cookies
import uuid

PORT = int(os.environ.get('PORT', 3000))

# Global session database (in-memory)
SESSIONS = {}
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

class CosmicDevServerHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for ease of development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # Disable caching for development so changes sync immediately
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def is_authenticated(self):
        cookie_header = self.headers.get('Cookie')
        print(f"[DEBUG] Cookie header: {cookie_header}")
        print(f"[DEBUG] Active Sessions: {list(SESSIONS.keys())}")
        if not cookie_header:
            return False
        
        try:
            cookie = http.cookies.SimpleCookie(cookie_header)
            if 'session_id' in cookie:
                session_id = cookie['session_id'].value
                print(f"[DEBUG] Parsed session_id: {session_id}")
                if session_id in SESSIONS:
                    print(f"[DEBUG] Session authenticated successfully.")
                    return True
                else:
                    print(f"[DEBUG] session_id not found in SESSIONS.")
        except Exception as e:
            print(f"Error parsing cookies: {e}")
        
        return False

    def do_GET(self):
        # Parse the request URL path
        parsed_url = urllib.parse.urlparse(self.path)
        decoded_path = urllib.parse.unquote(parsed_url.path)
        normalized_path = os.path.normpath(decoded_path).replace('\\', '/').lower()
        
        # Intercept auth check API call
        if parsed_url.path == '/api/check-auth':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            authenticated = self.is_authenticated()
            response = {'authenticated': authenticated}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return
        
        if not normalized_path.startswith('/'):
            normalized_path = '/' + normalized_path
            
        # Check if the path targets the /admin directory
        is_admin_path = normalized_path.startswith('/admin')
        
        # Exceptions that don't require authentication to view
        is_login_asset = any(x in normalized_path for x in [
            'login.html', 
            'login.css', 
            'global.css', 
            'admin-shared.css',
            'auth.js',
            'favicon.ico'
        ])
        
        if is_admin_path and not is_login_asset:
            if not self.is_authenticated():
                print(f"Unauthorized GET request to {normalized_path}. Redirecting to login.")
                self.send_response(302)
                self.send_header('Location', '/admin/login.html')
                self.end_headers()
                return
                
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/login':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                username = data.get('username')
                password = data.get('password')
                
                if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
                    session_id = uuid.uuid4().hex
                    SESSIONS[session_id] = True
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Set-Cookie', f'session_id={session_id}; Path=/; HttpOnly; SameSite=Strict')
                    self.end_headers()
                    response = {'success': True}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                    print("Admin logged in successfully. Session created.")
                else:
                    self.send_response(401)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    response = {'success': False, 'error': 'Invalid username or password'}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                    print("Admin login failed: invalid credentials.")
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {'success': False, 'error': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"Error handling /api/login: {e}")
                
        elif self.path == '/api/logout':
            try:
                cookie_header = self.headers.get('Cookie')
                if cookie_header:
                    cookie = http.cookies.SimpleCookie(cookie_header)
                    if 'session_id' in cookie:
                        session_id = cookie['session_id'].value
                        if session_id in SESSIONS:
                            del SESSIONS[session_id]
                            
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                # Expire the cookie
                self.send_header('Set-Cookie', 'session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict')
                self.end_headers()
                response = {'success': True}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print("Admin logged out successfully. Session deleted.")
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {'success': False, 'error': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"Error handling /api/logout: {e}")
                
        elif self.path == '/api/save':
            if not self.is_authenticated():
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {'success': False, 'error': 'Unauthorized'}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print("Blocked unauthorized POST request to /api/save")
                return

            try:
                # Read content length to know how many bytes to read
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                
                # Parse JSON to validate it
                data = json.loads(post_data.decode('utf-8'))
                
                # Write to js/data.json
                file_path = os.path.join(os.getcwd(), 'js', 'data.json')
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=4, ensure_ascii=False)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {'success': True}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print("Successfully updated js/data.json")
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {'success': False, 'error': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"Error handling /api/save: {e}")
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    # Change working directory to the directory of this script to ensure correct file paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, CosmicDevServerHandler)
    print(f"\n==================================================")
    print(f"Cosmic Portfolio Python Dev Server running at:")
    print(f"   http://localhost:{PORT}")
    print(f"==================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Dev Server...")
        httpd.server_close()
