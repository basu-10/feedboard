#!/usr/bin/env bash
set -e

# Runtime layout (all next to this repo, never inside it):
#   feedboard/      -> this git repo (code only)
#   feedboard-venv/ -> virtual environment (created here)
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$(dirname "$REPO_DIR")/feedboard-venv"
REQUIREMENTS="$REPO_DIR/requirements.txt"
APP_FILE="$REPO_DIR/app.py"

if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment at $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
    echo "Installing dependencies..."
    "$VENV_DIR/bin/pip" install --upgrade pip
    "$VENV_DIR/bin/pip" install -r "$REQUIREMENTS"
else
    echo "Virtual environment found at $VENV_DIR."
fi

echo "Starting Flask app..."
exec "$VENV_DIR/bin/python" "$APP_FILE"
