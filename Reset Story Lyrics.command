#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "This resets the Mac server password and server-side project index."
echo "Projects stored inside iPhone Safari are not deleted by this script."
read -r -p "Type RESET to continue: " ANSWER
[ "$ANSWER" = "RESET" ] || exit 0
rm -f "$ROOT/.story-lyrics-password"
rm -rf "$ROOT/backend/data"
echo "Reset complete. A new password will be generated at next launch."
read -r -p "Press Return to close..."
