#!/bin/bash
# Pre-flash the bring-up sketch onto many boards, one after another.
#   tools/preflash.sh chipbot     (Nano boards)
#   tools/preflash.sh peeko       (Uno boards)
#   tools/preflash.sh jarvis      (Uno boards)
# Plug in ONE board, press Enter, wait for "done", unplug, plug in the next, press Enter. Press q then Enter to stop.
# NOT TESTED ON REAL BOARDS YET: try it on two boards before you plan on it for 120.
set -u
ROBOT="${1:-}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
CLI="/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli"
SKETCH="$HERE/firmware/bringup/${ROBOT}_bringup"
[ -d "$SKETCH" ] || { echo "Usage: $0 chipbot|peeko|jarvis"; exit 1; }
[ -x "$CLI" ] || CLI="$(command -v arduino-cli || true)"
[ -n "$CLI" ] || { echo "arduino-cli not found (it ships inside the Arduino IDE app)"; exit 1; }
LIBS=(--libraries "$HOME/Documents/Arduino/libraries" --libraries "$HOME/Library/Arduino15/libraries")

if [ "$ROBOT" = "chipbot" ]; then FQBNS=("arduino:avr:nano:cpu=atmega328" "arduino:avr:nano:cpu=atmega328old"); else FQBNS=("arduino:avr:uno"); fi

COUNT=0
while true; do
  read -r -p "Plug in board #$((COUNT + 1)) and press Enter (q to quit): " ANS
  [ "$ANS" = "q" ] && break
  PORT="$(ls /dev/cu.usbserial* /dev/cu.usbmodem* /dev/cu.wchusbserial* 2>/dev/null | head -1)"
  [ -n "$PORT" ] || { echo "  no board found: check the cable (some cables only charge)"; continue; }
  DONE=0
  for FQBN in "${FQBNS[@]}"; do
    "$CLI" compile --fqbn "$FQBN" "${LIBS[@]}" --build-cache-path "${TMPDIR:-/tmp}/cb_pre_cache" "$SKETCH" >/dev/null 2>&1 || { echo "  compile failed for $FQBN"; continue; }
    if "$CLI" upload --fqbn "$FQBN" --port "$PORT" "$SKETCH" >/dev/null 2>&1; then DONE=1; echo "  done ($FQBN on $PORT). Unplug it and label it."; break; fi
  done
  [ "$DONE" = 1 ] && COUNT=$((COUNT + 1)) || echo "  upload failed: try another cable or port"
done
echo "Flashed $COUNT board(s)."
