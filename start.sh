#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_REQUIREMENTS="$ROOT_DIR/backend/requirements.txt"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

hash_file_value() {
  sha256sum "$1" | awk '{print $1}'
}

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

require_cmd "$PYTHON_BIN"
require_cmd node
require_cmd npm
require_cmd sha256sum

mkdir -p "$VENV_DIR"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "Creating Python virtual environment..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

BACKEND_HASH="$(hash_file_value "$BACKEND_REQUIREMENTS")"
BACKEND_STAMP="$VENV_DIR/.backend-requirements.sha256"

if [[ ! -f "$BACKEND_STAMP" ]] || [[ "$(cat "$BACKEND_STAMP")" != "$BACKEND_HASH" ]]; then
  echo "Installing backend dependencies..."
  "$VENV_DIR/bin/python" -m pip install --upgrade pip
  "$VENV_DIR/bin/python" -m pip install -r "$BACKEND_REQUIREMENTS"
  printf '%s\n' "$BACKEND_HASH" > "$BACKEND_STAMP"
fi

FRONTEND_HASH="$(hash_file_value "$FRONTEND_DIR/package-lock.json")"
FRONTEND_STAMP="$FRONTEND_DIR/node_modules/.package-lock.sha256"

if [[ ! -d "$FRONTEND_DIR/node_modules" ]] || [[ ! -f "$FRONTEND_STAMP" ]] || [[ "$(cat "$FRONTEND_STAMP")" != "$FRONTEND_HASH" ]]; then
  echo "Installing frontend dependencies..."
  (
    cd "$FRONTEND_DIR"
    npm ci
  )
  mkdir -p "$FRONTEND_DIR/node_modules"
  printf '%s\n' "$FRONTEND_HASH" > "$FRONTEND_STAMP"
fi

echo "Starting backend on http://localhost:${BACKEND_PORT} ..."
(
  cd "$ROOT_DIR"
  "$VENV_DIR/bin/python" -m uvicorn backend.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:${FRONTEND_PORT}/app/ ..."
echo "Press Ctrl+C to stop both services."
cd "$FRONTEND_DIR"
npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"
