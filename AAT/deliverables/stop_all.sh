#!/bin/bash
echo "Stopping all ContentFlow services..."
pkill -f "n8n start" 2>/dev/null && echo "[n8n] stopped" || echo "[n8n] not running"
pkill -f "ngrok http" 2>/dev/null && echo "[ngrok] stopped" || echo "[ngrok] not running"  
pkill -f "transcript_server" 2>/dev/null && echo "[transcript] stopped" || echo "[transcript] not running"
echo "All services stopped."
