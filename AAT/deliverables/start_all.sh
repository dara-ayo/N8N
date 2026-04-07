#!/bin/bash
# ContentFlow — Start All Services
# Keeps n8n, ngrok, and transcript server running continuously
# Usage: ./start_all.sh

LOG_DIR="/tmp/contentflow"
mkdir -p "$LOG_DIR"

echo "========================================="
echo "  ContentFlow — Starting All Services"
echo "========================================="

# Function to check if a service is running on a port
check_port() {
  lsof -i :$1 -t 2>/dev/null | head -1
}

# 1. Start n8n
start_n8n() {
  if [ -z "$(check_port 5678)" ]; then
    echo "[n8n] Starting..."
    nohup n8n start > "$LOG_DIR/n8n.log" 2>&1 &
    sleep 10
    if [ -n "$(check_port 5678)" ]; then
      echo "[n8n] Running on port 5678 ✓"
    else
      echo "[n8n] Failed to start ✗"
    fi
  else
    echo "[n8n] Already running on port 5678 ✓"
  fi
}

# 2. Start transcript server
start_transcript() {
  if [ -z "$(check_port 3456)" ]; then
    echo "[transcript] Starting..."
    nohup python3 /Users/ayodeleoluwafimidaraayo/Desktop/AAT/deliverables/transcript_server.py > "$LOG_DIR/transcript.log" 2>&1 &
    sleep 2
    if [ -n "$(check_port 3456)" ]; then
      echo "[transcript] Running on port 3456 ✓"
    else
      echo "[transcript] Failed to start ✗"
    fi
  else
    echo "[transcript] Already running on port 3456 ✓"
  fi
}

# 3. Start ngrok
start_ngrok() {
  if ! pgrep -f "ngrok http 5678" > /dev/null 2>&1; then
    echo "[ngrok] Starting tunnel to port 5678..."
    nohup ngrok http 5678 --log=stdout > "$LOG_DIR/ngrok.log" 2>&1 &
    sleep 5
    # Get the public URL
    NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d['tunnels'][0]['public_url'])" 2>/dev/null)
    if [ -n "$NGROK_URL" ]; then
      echo "[ngrok] Public URL: $NGROK_URL ✓"
      echo ""
      echo "========================================="
      echo "  SET THIS IN VERCEL ENV VARS:"
      echo "  VITE_N8N_WEBHOOK_BASE=${NGROK_URL}/webhook"
      echo "========================================="
      echo ""
      echo "$NGROK_URL" > "$LOG_DIR/ngrok_url.txt"
    else
      echo "[ngrok] Failed to get URL ✗"
    fi
  else
    NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d['tunnels'][0]['public_url'])" 2>/dev/null)
    echo "[ngrok] Already running: $NGROK_URL ✓"
  fi
}

# Start everything
start_n8n
start_transcript
start_ngrok

echo ""
echo "All services running. Starting watchdog..."
echo ""

# 4. Watchdog — check every 30 seconds, restart anything that died
while true; do
  sleep 30
  
  # Check n8n
  if [ -z "$(check_port 5678)" ]; then
    echo "[watchdog] n8n died — restarting..."
    start_n8n
  fi
  
  # Check transcript server
  if [ -z "$(check_port 3456)" ]; then
    echo "[watchdog] transcript server died — restarting..."
    start_transcript
  fi
  
  # Check ngrok
  if ! pgrep -f "ngrok http 5678" > /dev/null 2>&1; then
    echo "[watchdog] ngrok died — restarting..."
    start_ngrok
  fi
done
