#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/backend"
export LYRIC_VIS_WEB="../web"
PORT="${LYRIC_VIS_PORT:-8090}"
export LYRIC_VIS_ADDR=":${PORT}"
export LYRIC_VIS_USERNAME="${LYRIC_VIS_USERNAME:-story}"
PASSWORD_FILE="$ROOT/.story-lyrics-password"
if [ -z "$LYRIC_VIS_PASSWORD" ]; then
  if [ ! -f "$PASSWORD_FILE" ]; then
    (umask 077; LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 18 > "$PASSWORD_FILE")
  fi
  export LYRIC_VIS_PASSWORD="$(cat "$PASSWORD_FILE")"
fi
LOCAL_URL="http://localhost:${PORT}"
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
echo ""
echo "Story Lyrics is starting securely."
echo "Username: ${LYRIC_VIS_USERNAME}"
echo "Password: ${LYRIC_VIS_PASSWORD}"
echo "Mac:      ${LOCAL_URL}"
if [ -n "$LAN_IP" ]; then echo "iPhone:   http://${LAN_IP}:${PORT}"; fi
if ! command -v ffmpeg >/dev/null 2>&1; then echo "Warning: MP4 export needs: brew install ffmpeg"; fi
echo ""
(sleep 1; open "$LOCAL_URL") &
go run ./cmd/server
