#!/bin/bash
# Poison Payload Test — adversarial inputs designed to break the system
# Tests: deeply nested JSON, huge strings, unicode edge cases, malformed data
# Usage: ./poison_payloads.sh [webhook_url]

WEBHOOK_URL="${1:-http://localhost:5678/webhook/content-submit}"
RESULTS_DIR="./poison_results"

mkdir -p "$RESULTS_DIR"
echo "=== Poison Payload Tests ==="
echo "Target: $WEBHOOK_URL"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

run_test() {
  local name=$1
  local payload=$2
  local expected_behavior=$3

  echo "--- Test: $name ---"
  echo "Expected: $expected_behavior"

  response=$(curl -s -w "\n---HTTP_CODE:%{http_code}---\nTIME:%{time_total}" \
    -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    --max-time 30 2>&1)

  http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
  time_total=$(echo "$response" | grep -o 'TIME:[0-9.]*' | cut -d: -f2)
  body=$(echo "$response" | sed '/---HTTP_CODE/,$d')

  echo "Result: HTTP $http_code in ${time_total}s"
  echo "Body preview: $(echo "$body" | head -c 200)"
  echo ""

  # Save result
  cat > "$RESULTS_DIR/${name}.json" <<RESULT
{
  "test": "$name",
  "http_code": "$http_code",
  "time_seconds": "$time_total",
  "expected": "$expected_behavior",
  "body_preview": $(echo "$body" | head -c 500 | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '"parse_error"')
}
RESULT
}

# Test 1: Deeply nested JSON (10+ levels)
echo "Generating deeply nested JSON..."
NESTED_JSON=$(python3 -c "
import json
d = {'rawIdea': 'test'}
current = d
for i in range(15):
    current['nested'] = {'level': i, 'data': 'x' * 100}
    current = current['nested']
print(json.dumps(d))
")
run_test "deeply_nested_json" "$NESTED_JSON" "Should process normally — validation only checks top-level fields"

# Test 2: 10,000 character string in rawIdea
echo "Generating 10K character string..."
LONG_STRING=$(python3 -c "print('{\"rawIdea\": \"' + 'A' * 10000 + '\"}')")
run_test "10k_char_string" "$LONG_STRING" "Should accept — under 1MB limit, rawIdea truncated to 10000 chars by validation"

# Test 3: 100,000 character string (approaching limits)
echo "Generating 100K character string..."
VERY_LONG=$(python3 -c "print('{\"rawIdea\": \"' + 'B' * 100000 + '\"}')")
run_test "100k_char_string" "$VERY_LONG" "Should accept but content will be generic — AI can handle long inputs but quality degrades"

# Test 4: Array with 10,000 items in unexpected field
ARRAY_PAYLOAD=$(python3 -c "
import json
d = {'rawIdea': 'Normal idea', 'tags': list(range(10000))}
print(json.dumps(d))
")
run_test "10k_item_array" "$ARRAY_PAYLOAD" "Should process — extra fields ignored by validation, only rawIdea used"

# Test 5: Zero-width characters
run_test "zero_width_chars" '{"rawIdea": "Hello\u200b\u200b\u200b\u200bWorld\u200b\ufeff\u200b"}' "Should accept — zero-width chars are valid unicode, AI handles them fine"

# Test 6: RTL text mixed with LTR
run_test "rtl_mixed" '{"rawIdea": "English text مرحبا بالعالم more English العربية"}' "Should accept — mixed directionality is valid text"

# Test 7: Emoji sequences (complex multi-codepoint)
run_test "complex_emoji" '{"rawIdea": "Testing 👨‍👩‍👧‍👦 family emoji 🏳️‍🌈 flag emoji 👩🏿‍💻 skin tone emoji sequences"}' "Should accept — emoji are valid unicode"

# Test 8: Null bytes in string
run_test "null_bytes" '{"rawIdea": "Content with \u0000 null \u0000 bytes"}' "Should accept — null bytes in JSON strings are valid, may be stripped by processing"

# Test 9: Extremely long URL
LONG_URL=$(python3 -c "print('{\"url\": \"https://example.com/' + 'a' * 5000 + '\"}')")
run_test "5k_char_url" "$LONG_URL" "Should accept format validation (starts with https://) but HTTP fetch will likely fail with 404 or timeout"

# Test 10: URL pointing to binary content
run_test "binary_url" '{"url": "https://example.com/image.png"}' "Should handle — URL fetch succeeds but content extraction finds no meaningful text, returns 422"

# Test 11: URL with redirect chain
run_test "redirect_chain" '{"url": "https://httpbin.org/redirect/5"}' "Should follow redirects up to n8n default limit, then extract content from final destination"

# Test 12: Payload with all types mixed wrong
run_test "type_chaos" '{"rawIdea": null, "url": 123, "publishImmediately": "banana"}' "Should return 400 — rawIdea is null (fails after coercion), url is 123 (fails URL format check)"

# Test 13: Valid JSON but wrong content type header
echo "--- Test: wrong_content_type ---"
response=$(curl -s -w "\n---HTTP_CODE:%{http_code}---" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: text/plain" \
  -d '{"rawIdea": "This is sent as text/plain"}' \
  --max-time 30 2>&1)
http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
echo "Expected: n8n webhook may reject or parse differently"
echo "Result: HTTP $http_code"
echo ""

# Test 14: Empty string fields
run_test "empty_strings" '{"rawIdea": "", "url": ""}' "Should return 400 — both fields empty after trim"

# Test 15: Very rapid sequential requests (same content, testing dedup timing)
echo "--- Test: rapid_dedup ---"
echo "Sending same content 5 times in rapid succession..."
for i in $(seq 1 5); do
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{"rawIdea": "Exact same content for dedup testing"}' \
    --max-time 30)
  echo "  Request $i: HTTP $response"
done
echo "Expected: First returns 200, subsequent return 409 (duplicate)"
echo ""

echo "=== Poison Tests Complete ==="
echo "Results in: $RESULTS_DIR/"
