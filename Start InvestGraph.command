#!/bin/zsh
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

PORT="${PORT:-4173}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed or not available in PATH."
  echo "Install Node.js first, then run this launcher again."
  read -r "?Press Enter to close..."
  exit 1
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "InvestGraph AI already appears to be running on port $PORT."
  echo "Mac:    http://localhost:$PORT/"
  network_ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
  if [ -n "$network_ip" ]; then
    echo "Phone:  http://$network_ip:$PORT/"
  fi
  open "http://localhost:$PORT/" >/dev/null 2>&1 || true
  read -r "?Press Enter to close..."
  exit 0
fi

echo "Starting InvestGraph AI..."
echo "Keep this window open while using the app from Mac, iPhone, or Windows."
echo
node server.js
