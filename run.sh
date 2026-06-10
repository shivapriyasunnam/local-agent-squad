#!/bin/bash

UVICORN=/opt/homebrew/Caskroom/miniconda/base/bin/uvicorn
SERVER_PORT=8000
WEBAPP_PORT=3001

kill_port() {
  local port=$1
  local pid
  pid=$(lsof -ti:"$port" 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Killing process on port $port (PID $pid)..."
    kill -9 $pid
    sleep 1
  fi
}

# --- PostgreSQL ---
if pg_isready -q 2>/dev/null; then
  echo "PostgreSQL already running, skipping."
else
  echo "Starting PostgreSQL..."
  brew services start postgresql@17
  sleep 2
fi

# --- Backend ---
kill_port $SERVER_PORT
echo "Starting backend on port $SERVER_PORT..."
cd "$(dirname "$0")/server"
$UVICORN server:app --port $SERVER_PORT &
BACKEND_PID=$!
cd - > /dev/null

# --- Web app ---
kill_port $WEBAPP_PORT
echo "Starting web app..."
cd "$(dirname "$0")/web-app"
npm start &
WEBAPP_PID=$!
cd - > /dev/null

echo ""
echo "Backend PID: $BACKEND_PID  (http://localhost:$SERVER_PORT)"
echo "Web app PID: $WEBAPP_PID   (http://localhost:$WEBAPP_PORT)"
echo ""
echo "Press Ctrl+C to stop both."

trap "echo 'Stopping...'; kill $BACKEND_PID $WEBAPP_PID 2>/dev/null; exit 0" INT TERM
wait
