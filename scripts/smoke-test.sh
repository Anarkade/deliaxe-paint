#!/usr/bin/env bash
set -euo pipefail

# Smoke test for vintage-palette-studio
# 1) Run npm run build
# 2) Start vite preview on port 5174
# 3) Wait for server and curl / expecting HTTP 200
# 4) Kill server and exit

PORT=5174
HOST=127.0.0.1
PREVIEW_CMD="npm run preview -- --port $PORT --strictPort"

echo "[smoke-test] running npm run build..."
npm run build

# Start preview in background
echo "[smoke-test] starting preview server on port $PORT..."
# Use a subshell so we can capture the PID
( $PREVIEW_CMD ) &
PREVIEW_PID=$!

echo "[smoke-test] preview PID=$PREVIEW_PID"

# Wait for server to be up (max 20s)
READY=0
for i in {1..40}; do
  if curl -sSf --max-time 2 http://$HOST:$PORT/ >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.5
done

if [ "$READY" -ne 1 ]; then
  echo "[smoke-test] preview server did not respond, killing PID $PREVIEW_PID"
  kill $PREVIEW_PID || true
  exit 2
fi

# Check root path
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$HOST:$PORT/)
if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "[smoke-test] unexpected HTTP status: $HTTP_STATUS"
  kill $PREVIEW_PID || true
  exit 3
fi

echo "[smoke-test] success: HTTP 200 received"

# Cleanup
kill $PREVIEW_PID || true
wait $PREVIEW_PID 2>/dev/null || true

exit 0
