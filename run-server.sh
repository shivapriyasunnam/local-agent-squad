#!/bin/bash

UVICORN=/opt/homebrew/Caskroom/miniconda/base/bin/uvicorn
PORT=8000
ROOT="$(cd "$(dirname "$0")" && pwd)"

pid=$(lsof -ti:"$PORT" 2>/dev/null)
[ -n "$pid" ] && echo "Killing process on port $PORT..." && kill -9 $pid && sleep 0.5

echo "Starting backend on http://localhost:$PORT..."
cd "$ROOT/server"
$UVICORN server:app --port $PORT --reload
