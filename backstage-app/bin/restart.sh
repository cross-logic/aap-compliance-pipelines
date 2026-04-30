#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-mock}"

"$SCRIPT_DIR/stop.sh"
sleep 2
"$SCRIPT_DIR/start.sh" "$MODE"
