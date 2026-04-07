#!/bin/bash
# Burst Load Test — 20 concurrent requests in ~2 seconds
# Tests: response times, error rates, dropped requests, execution queue behavior
# Usage: ./burst_load.sh [webhook_url]

WEBHOOK_URL="${1:-http://localhost:5678/webhook/content-submit}"
RESULTS_DIR="./burst_results"
TOTAL_REQUESTS=20
START_TIME=$(date +%s%N)

mkdir -p "$RESULTS_DIR"
echo "=== Burst Load Test ==="
echo "Target: $WEBHOOK_URL"
echo "Requests: $TOTAL_REQUESTS (concurrent)"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Generate unique payloads to avoid duplicate detection
generate_payload() {
  local id=$1
  local timestamp=$(date +%s%N)
  cat <<EOF
{
  "rawIdea": "Burst test idea #${id} - ${timestamp}: How technology is transforming industry sector ${id} with innovative approaches to common challenges in the modern workplace environment.",
  "publishImmediately": false
}
EOF
}

# Fire all requests concurrently
for i in $(seq 1 $TOTAL_REQUESTS); do
  payload=$(generate_payload $i)
  (
    req_start=$(date +%s%N)
    response=$(curl -s -w "\n%{http_code}\n%{time_total}" \
      -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      --max-time 120 2>&1)

    req_end=$(date +%s%N)
    http_code=$(echo "$response" | tail -2 | head -1)
    time_total=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -2)

    echo "{\"request\": $i, \"http_code\": \"$http_code\", \"time_seconds\": \"$time_total\", \"body_preview\": $(echo "$body" | head -c 200 | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '\"parse_error\"')}" > "$RESULTS_DIR/req_$i.json"
    echo "Request $i: HTTP $http_code in ${time_total}s"
  ) &
done

# Wait for all background jobs
wait

END_TIME=$(date +%s%N)
DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))

echo ""
echo "=== Results ==="
echo "Total duration: ${DURATION_MS}ms"
echo ""

# Aggregate results
success=0
errors=0
total_time=0

for f in "$RESULTS_DIR"/req_*.json; do
  code=$(python3 -c "import json; print(json.load(open('$f'))['http_code'])" 2>/dev/null)
  time_s=$(python3 -c "import json; print(json.load(open('$f'))['time_seconds'])" 2>/dev/null)

  if [ "$code" = "200" ]; then
    success=$((success + 1))
  else
    errors=$((errors + 1))
    echo "  FAILED: $(basename $f) — HTTP $code"
  fi
done

echo "Successful: $success / $TOTAL_REQUESTS"
echo "Errors: $errors / $TOTAL_REQUESTS"
echo "Error rate: $(echo "scale=1; $errors * 100 / $TOTAL_REQUESTS" | bc)%"
echo ""
echo "Raw results in: $RESULTS_DIR/"
