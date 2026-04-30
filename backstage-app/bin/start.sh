#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_DIR="$APP_DIR/.pids"

MODE="${1:-mock}"

if [[ "$MODE" != "mock" && "$MODE" != "live" ]]; then
  echo "Usage: $0 [mock|live]"
  echo "  mock  - Use sample data, no AAP connection needed (default)"
  echo "  live  - Connect to real AAP Controller via .env credentials"
  exit 1
fi

mkdir -p "$PID_DIR"

# Kill any existing instances
"$SCRIPT_DIR/stop.sh" 2>/dev/null || true

cd "$APP_DIR"

# Set the data source mode in app-config.yaml
sed -i '' "s/dataSource: .*/dataSource: $MODE/" app-config.yaml 2>/dev/null || \
  sed -i "s/dataSource: .*/dataSource: $MODE/" app-config.yaml

# Load env vars from .env (needed for live mode)
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "=== Starting Compliance Pipelines ($MODE mode) ==="

# Start backend
echo "Starting backend on :7007..."
yarn backstage-cli repo start backend > "$PID_DIR/backend.log" 2>&1 &
echo $! > "$PID_DIR/backend.pid"

# Wait for backend to be ready
echo -n "Waiting for backend"
for i in $(seq 1 30); do
  if curl -s http://localhost:7007/api/compliance/health > /dev/null 2>&1; then
    echo " ready!"
    break
  fi
  echo -n "."
  sleep 2
done

# Verify backend mode
ACTUAL_MODE=$(curl -s http://localhost:7007/api/compliance/health 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('dataSource','unknown'))" 2>/dev/null || echo "unknown")
echo "Backend dataSource: $ACTUAL_MODE"

if [ "$ACTUAL_MODE" = "unknown" ]; then
  echo "WARNING: Backend may not have started correctly. Check $PID_DIR/backend.log"
fi

# Start frontend
echo "Starting frontend on :3000..."
yarn backstage-cli repo start app > "$PID_DIR/frontend.log" 2>&1 &
echo $! > "$PID_DIR/frontend.pid"

# Wait for frontend
echo -n "Waiting for frontend"
for i in $(seq 1 20); do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo " ready!"
    break
  fi
  echo -n "."
  sleep 2
done

echo ""
echo "=== Compliance Pipelines Running ==="
echo "  Mode:     $MODE"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:7007"
echo "  Logs:     $PID_DIR/backend.log, $PID_DIR/frontend.log"
echo ""
echo "  Stop:     ./bin/stop.sh"
echo "  Restart:  ./bin/restart.sh [$MODE]"
echo "  Logs:     tail -f $PID_DIR/backend.log"
