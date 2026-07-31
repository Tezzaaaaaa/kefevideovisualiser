#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${LYRIC_VIS_PORT:-8090}"
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is required. Install it with: brew install cloudflared"
  exit 1
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FFmpeg is required for MP4 export. Install it with: brew install ffmpeg"
  exit 1
fi
PASSWORD_FILE="$ROOT/.story-lyrics-password"
if [ ! -f "$PASSWORD_FILE" ]; then
  (umask 077; LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 18 > "$PASSWORD_FILE")
fi
export LYRIC_VIS_PASSWORD="$(cat "$PASSWORD_FILE")"
export LYRIC_VIS_USERNAME="${LYRIC_VIS_USERNAME:-story}"
export LYRIC_VIS_PORT="$PORT"
echo ""
echo "Remote Story Lyrics is starting."
echo "Username: ${LYRIC_VIS_USERNAME}"
echo "Password: ${LYRIC_VIS_PASSWORD}"
echo "The HTTPS iPhone address will appear below as a trycloudflare.com URL."
echo "Keep this window and your Mac running while using it."
echo ""
"$ROOT/Start Story Lyrics.command" > "$ROOT/story-lyrics-server.log" 2>&1 &
SERVER_PID=$!
cleanup(){ kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
for i in {1..30}; do curl -fsS -u "${LYRIC_VIS_USERNAME}:${LYRIC_VIS_PASSWORD}" "http://localhost:${PORT}/api/v1/health" >/dev/null && break; sleep 1; done
cloudflared tunnel --url "http://localhost:${PORT}"
