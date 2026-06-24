#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$ROOT/public"
SOURCE="$PUBLIC/Chat.png"

if [[ ! -f "$SOURCE" ]]; then
  echo "Source icon not found: $SOURCE" >&2
  exit 1
fi

cp "$SOURCE" "$PUBLIC/pwa-512.png"
cp "$SOURCE" "$PUBLIC/favicon.png"
cp "$SOURCE" "$PUBLIC/apple-touch-icon.png"
sips -z 192 192 "$SOURCE" --out "$PUBLIC/pwa-192.png" >/dev/null
sips -z 32 32 "$SOURCE" --out "$PUBLIC/favicon-32.png" >/dev/null

echo "PWA icons generated from Chat.png."
