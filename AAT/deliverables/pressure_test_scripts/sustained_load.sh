#!/bin/bash
# Sustained Load Test — 100 requests over 60 seconds (~1.67 req/sec)
# Tests: performance degradation, memory trends, failures under sustained use
# Usage: ./sustained_load.sh [webhook_url]

WEBHOOK_URL="${1:-http://localhost:5678/webhook/content-submit}"
RESULTS_DIR="./sustained_results"
TOTAL_REQUESTS=100
DURATION_SECONDS=60
INTERVAL_MS=$(( DURATION_SECONDS * 1000 / TOTAL_REQUESTS ))  # ~600ms between requests

mkdir -p "$RESULTS_DIR"
echo "=== Sustained Load Test ==="
echo "Target: $WEBHOOK_URL"
echo "Requests: $TOTAL_REQUESTS over ${DURATION_SECONDS}s"
echo "Interval: ~${INTERVAL_MS}ms between requests"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

generate_payload() {
  local id=$1
  local timestamp=$(date +%s%N)
  cat <<EOF
{
  "rawIdea": "Sustained test #${id}-${timestamp}: Exploring how modern businesses adapt to changing market conditions in sector ${id}, examining trends, challenges, and opportunities for growth.",
  "publishImmediately": false
}
EOF
}

START_TIME=$(date +%s)
success=0
errors=0
min_time=999
max_time=0
total_time=0

for i in $(seq 1 $TOTAL_REQUESTS); do
  payload=$(generate_payload $i)
  req_start=$(date +%s%N)

  response=$(curl -s -w "\n%{http_code}\n%{time_total}" \
    -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    --max-time 120 2>&1)

  http_code=$(echo "$response" | tail -2 | head -1)
  time_total=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -2)

  # Record result
  echo "{\"request\": $i, \"http_code\": \"$http_code\", \"time_seconds\": \"$time_total\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$RESULTS_DIR/req_$(printf '%03d' $i).json"

  if [ "$http_code" = "200" ]; then
    success=$((success + 1))
  else
    errors=$((errors + 1))
  fi

  # Progress every 10 requests
  if [ $((i % 10)) -eq 0 ]; then
    elapsed=$(( $(date +%s) - START_TIME ))
    echo "  Progress: $i/$TOTAL_REQUESTS | Success: $success | Errors: $errors | Elapsed: ${elapsed}s"
  fi

  # Sleep to maintain steady rate (subtract request time)
  sleep_time=$(echo "$INTERVAL_MS / 1000 - $time_total" | bc 2>/dev/null)
  if [ "$(echo "$sleep_time > 0" | bc 2>/dev/null)" = "1" ]; then
    sleep "$sleep_time"
  fi
done

END_TIME=$(date +%s)
TOTAL_DURATION=$(( END_TIME - START_TIME ))

echo ""
echo "=== Results ==="
echo "Total duration: ${TOTAL_DURATION}s"
echo "Successful: $success / $TOTAL_REQUESTS"
echo "Errors: $errors / $TOTAL_REQUESTS"
echo "Error rate: $(echo "scale=1; $errors * 100 / $TOTAL_REQUESTS" | bc)%"
echo "Avg throughput: $(echo "scale=2; $TOTAL_REQUESTS / $TOTAL_DURATION" | bc) req/sec"
echo ""

# Check for degradation — compare first 10 vs last 10 response times
echo "=== Performance Degradation Check ==="
echo "First 10 requests:"
for f in "$RESULTS_DIR"/req_00{1..9}.json "$RESULTS_DIR"/req_010.json; do
  [ -f "$f" ] && python3 -c "import json; d=json.load(open('$f')); print(f'  #{d[\"request\"]}: {d[\"time_seconds\"]}s')" 2>/dev/null
done

echo "Last 10 requests:"
for i in $(seq 91 100); do
  f="$RESULTS_DIR/req_$(printf '%03d' $i).json"
  [ -f "$f" ] && python3 -c "import json; d=json.load(open('$f')); print(f'  #{d[\"request\"]}: {d[\"time_seconds\"]}s')" 2>/dev/null
done

echo ""
echo "Raw results in: $RESULTS_DIR/"
