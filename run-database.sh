#!/bin/bash

if pg_isready -q 2>/dev/null; then
  echo "PostgreSQL already running."
else
  echo "Starting PostgreSQL..."
  brew services start postgresql@17
fi
