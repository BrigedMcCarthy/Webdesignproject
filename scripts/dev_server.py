#!/usr/bin/env python3
"""
dev_server.py

Small development HTTP server that serves the project root and exposes
simple endpoints to support the revamp4 viewer without third-party deps.

Endpoints:
- POST /guestbook    -> accepts JSON {name,msg} and appends to guestbook.json
- POST /reset-build  -> sets build=1 and updates buildTime in filetree.json
- POST /upload-filetree -> accepts raw JSON body and overwrites filetree.json

Run:
  python3 scripts/dev_server.py 8000

This server is for local development only. It does not implement auth.
"""
import http.server
import socketserver
import json
import sys
from urllib.parse import urlparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILETREE = ROOT / 'filetree.json'
GUESTBOOK = ROOT / 'guestbook.json'

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Serve files relative to repo root
        # remove query
        p = urlparse(path).path
        out = ROOT.joinpath(p.lstrip('/')).resolve()
        try:
            # prevent escaping root
            out.relative_to(ROOT)
        except Exception:
            return super().translate_path(path)
        return str(out)

    def do_POST(self):
        p = urlparse(self.path).path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length) if length else b''
        try:
            if p == '/guestbook':
                data = json.loads(body.decode('utf-8') or '{}')
                if not data.get('name') and not data.get('msg'):
                    self.send_response(400); self.end_headers(); self.wfile.write(b'missing'); return
                arr = []
                if GUESTBOOK.exists():
                    try: arr = json.loads(GUESTBOOK.read_text(encoding='utf-8'))
                    except Exception: arr = []
                # preserve client-provided id if present; otherwise generate one from timestamp
                now_ms = int(__import__('time').time()*1000)
                entry_id = str(data.get('id') or now_ms)
                entry_t = int(data.get('t') or now_ms)
                arr.append({ 'id': entry_id, 'name': data.get('name','Guest'), 'msg': data.get('msg',''), 't': entry_t })
                GUESTBOOK.write_text(json.dumps(arr, indent=2), encoding='utf-8')
                self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
                return
            if p == '/reset-build':
                if not FILETREE.exists():
                    self.send_response(404); self.end_headers(); self.wfile.write(b'no filetree'); return
                try:
                    doc = json.loads(FILETREE.read_text(encoding='utf-8'))
                except Exception:
                    doc = {}
                doc['build'] = 1
                doc['buildTime'] = int(__import__('time').time()*1000)
                FILETREE.write_text(json.dumps(doc, indent=2), encoding='utf-8')
                self.send_response(200); self.end_headers(); self.wfile.write(b'ok'); return
            if p == '/guestbook/upload':
                # Accept raw JSON array to overwrite guestbook.json (for local moderation)
                try:
                    text = body.decode('utf-8')
                    parsed = json.loads(text)
                    # ensure it's a list
                    if not isinstance(parsed, list):
                        self.send_response(400); self.end_headers(); self.wfile.write(b'expected array'); return
                    GUESTBOOK.write_text(json.dumps(parsed, indent=2), encoding='utf-8')
                    self.send_response(200); self.end_headers(); self.wfile.write(b'ok'); return
                except Exception as e:
                    self.send_response(400); self.end_headers(); self.wfile.write(str(e).encode('utf-8')); return
            if p == '/upload-filetree':
                # write raw JSON body to filetree.json
                try:
                    text = body.decode('utf-8')
                    json.loads(text)
                    FILETREE.write_text(text, encoding='utf-8')
                    self.send_response(200); self.end_headers(); self.wfile.write(b'ok'); return
                except Exception as e:
                    self.send_response(400); self.end_headers(); self.wfile.write(str(e).encode('utf-8')); return
        except Exception as e:
            self.send_response(500); self.end_headers(); self.wfile.write(str(e).encode('utf-8'))
            return
        # fallback to 404
        self.send_response(404); self.end_headers(); self.wfile.write(b'not-found')

    def do_DELETE(self):
        p = urlparse(self.path).path
        try:
            if p.startswith('/guestbook/'):
                id_to_remove = p.split('/')[-1]
                arr = []
                if GUESTBOOK.exists():
                    try: arr = json.loads(GUESTBOOK.read_text(encoding='utf-8'))
                    except Exception: arr = []
                new = [e for e in arr if str(e.get('id','')) != id_to_remove]
                GUESTBOOK.write_text(json.dumps(new, indent=2), encoding='utf-8')
                self.send_response(200); self.end_headers(); self.wfile.write(b'ok'); return
        except Exception as e:
            self.send_response(500); self.end_headers(); self.wfile.write(str(e).encode('utf-8'))
            return
        self.send_response(404); self.end_headers(); self.wfile.write(b'not-found')

def run(port=8000):
    Handler.directory = str(ROOT)
    with socketserver.ThreadingTCPServer(('', port), Handler) as httpd:
        print('Serving at port', port, 'root', ROOT)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nShutting down')

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run(port)
