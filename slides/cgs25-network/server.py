import http.server
import json
import os

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/save-layout':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                coords = json.loads(post_data.decode('utf-8'))
                
                # Write to data/layout_positions.json in the current directory
                filepath = os.path.join(os.getcwd(), 'data', 'layout_positions.json')
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(coords, f, indent=2)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"status":"success"}')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f'{{"status":"error","message":"{str(e)}"}}'.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def end_headers(self):
        # Support CORS just in case
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

if __name__ == '__main__':
    port = 8080
    server = http.server.HTTPServer(('0.0.0.0', port), CustomHandler)
    print(f"Server running on port {port} with dynamic /save-layout endpoint...")
    server.serve_forever()
