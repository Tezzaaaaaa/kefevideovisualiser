#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
FAIL=0
check(){ if command -v "$1" >/dev/null 2>&1; then echo "✓ $1 found"; else echo "✗ $1 missing"; FAIL=1; fi; }
echo "Story Lyrics 1.0 preflight"
check go
check ffmpeg
if command -v cloudflared >/dev/null 2>&1; then echo "✓ cloudflared found (remote access ready)"; else echo "• cloudflared not installed (only needed for remote access)"; fi
cd "$ROOT/backend" || exit 1
if command -v go >/dev/null 2>&1; then
  go test ./... && echo "✓ backend tests passed" || FAIL=1
fi
if [ "$FAIL" -eq 0 ]; then echo "All required checks passed."; else echo "Install missing requirements, then run this check again."; fi
read -r -p "Press Return to close..."
exit "$FAIL"
