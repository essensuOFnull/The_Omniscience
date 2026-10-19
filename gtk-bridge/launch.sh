#!/bin/sh
# Usage: gtk-bridge/launch.sh <app> [args...]
#
# CSD-тень GTK4 (12px или около того) теперь компенсируется прямо в C-хуке
# через чтение свойства _GTK_FRAME_EXTENTS. Внешние зависимости (gtk-nocsd)
# не нужны.

DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK="$DIR/native-hook/libgtk-hook.so"

if [ ! -f "$HOOK" ]; then
  echo "[gtk-bridge] hook not built: $HOOK" >&2
  echo "[gtk-bridge] run: npm run build:gtk-bridge" >&2
  exit 1
fi

exec env \
  LD_PRELOAD="$HOOK" \
  GTK_BRIDGE_SOCKET=/tmp/gtk-bridge.sock \
  GTK_HOOK_HIDE="${GTK_HOOK_HIDE:-0}" \
  GTK_HOOK_HIDE_OPACITY="${GTK_HOOK_HIDE_OPACITY:-0.01}" \
  "$@"