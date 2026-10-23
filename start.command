#!/bin/zsh
set -e

SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR"

PORT=8765
URL="http://127.0.0.1:${PORT}/"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Ink Atlas needs Python 3 to start its local file server."
  echo "You can also serve this folder with any static web server."
  read -r "?Press Return to close."
  exit 1
fi

echo "Starting Ink Atlas 1.0 at $URL"
echo "Keep this window open while using the app. Press Control-C to stop it."
open "$URL"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
