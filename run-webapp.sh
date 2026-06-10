#!/bin/bash

PORT=3001
ROOT="$(cd "$(dirname "$0")" && pwd)"

pid=$(lsof -ti:"$PORT" 2>/dev/null)
[ -n "$pid" ] && echo "Killing process on port $PORT..." && kill -9 $pid && sleep 0.5

echo "Starting web app on http://localhost:$PORT..."
cd "$ROOT/web-app"
PORT=$PORT npm start
