#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_DIR="$APP_DIR/.pids"

echo "=== Stopping Compliance Pipelines ==="

# Kill by PID files
for service in frontend backend; do
  if [ -f "$PID_DIR/$service.pid" ]; then
    PID=$(cat "$PID_DIR/$service.pid")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID" 2>/dev/null
      echo "Stopped $service (PID $PID)"
    fi
    rm -f "$PID_DIR/$service.pid"
  fi
done

# Also kill by port (belt + suspenders)
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null && echo "Killed process on :3000" || true
lsof -ti:7007 2>/dev/null | xargs kill -9 2>/dev/null && echo "Killed process on :7007" || true

echo "Stopped."
