#!/usr/bin/env python3
"""Simple HTTP server that extracts YouTube transcripts."""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json, urllib.parse, sys
sys.path.insert(0, '/Users/ayodeleoluwafimidaraayo/Library/Python/3.9/lib/python/site-packages')
from youtube_transcript_api import YouTubeTranscriptApi
import re

class TranscriptHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        video_id = params.get('v', [None])[0]
        url = params.get('url', [None])[0]
        
        # Extract video ID from URL if provided
        if not video_id and url:
            patterns = [
                r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})',
                r'youtube\.com\/live\/([a-zA-Z0-9_-]{11})'
            ]
            for p in patterns:
                m = re.search(p, url)
                if m:
                    video_id = m.group(1)
                    break
        
        if not video_id:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "No video ID provided"}).encode())
            return
        
        try:
            ytt = YouTubeTranscriptApi()
            transcript = ytt.fetch(video_id)
            text = ' '.join([t.text for t in transcript.snippets])
            
            # Get video title from the transcript metadata if available
            title = getattr(transcript, 'video_title', '') or ''
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "transcript": text,
                "videoId": video_id,
                "charCount": len(text),
                "language": getattr(transcript, 'language', 'en'),
                "title": title
            }).encode())
        except Exception as e:
            self.send_response(200)  # Still 200 so n8n doesn't error
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "transcript": "",
                "error": str(e),
                "videoId": video_id
            }).encode())
    
    def log_message(self, format, *args):
        pass  # Suppress logs

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 3456), TranscriptHandler)
    print("Transcript server running on http://127.0.0.1:3456")
    server.serve_forever()
