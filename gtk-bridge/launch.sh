#!/bin/sh
# Usage: gtk-bridge/launch.sh <app> [args...]
# Запускает GTK4-приложение с хуком и сокетом демона.
#
# Переменные окружения:
#   GTK_HOOK_DEBUG=1          — подробный лог хука в stderr
#   GTK_HOOK_HIDE=1           — скрыть оригинальное окно (по умолчанию 0)
#   GTK_HOOK_HIDE_OPACITY=X   — прозрачность скрытого окна (0.01)

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