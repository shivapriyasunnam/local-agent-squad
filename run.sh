#!/bin/bash

UVICORN=/opt/homebrew/Caskroom/miniconda/base/bin/uvicorn
SERVER_PORT=8000
WEBAPP_PORT=3001
ROOT="$(cd "$(dirname "$0")" && pwd)"

kill_port() {
  local pid
  pid=$(lsof -ti:"$1" 2>/dev/null)
  [ -n "$pid" ] && kill -9 $pid 2>/dev/null && sleep 0.5 || true
}

# --- PostgreSQL ---
if pg_isready -q 2>/dev/null; then
  echo "PostgreSQL already running, skipping."
else
  echo "Starting PostgreSQL..."
  brew services start postgresql@17 && sleep 2
fi

kill_port $SERVER_PORT
kill_port $WEBAPP_PORT

# --- Backend (background) ---
echo "Starting backend on port $SERVER_PORT..."
(cd "$ROOT/server" && $UVICORN server:app --port $SERVER_PORT) &
BACKEND_PID=$!

cleanup() {
  echo "Stopping..."
  kill $BACKEND_PID 2>/dev/null
  kill_port $SERVER_PORT
  exit 0
}
trap cleanup INT TERM

echo "Backend: http://localhost:$SERVER_PORT (PID $BACKEND_PID)"
echo "Web app: http://localhost:$WEBAPP_PORT"
echo "Press Ctrl+C to stop both."
echo ""

# --- Web app (foreground so compilation output is visible) ---
cd "$ROOT/web-app"
PORT=$WEBAPP_PORT BROWSER=none npm start
