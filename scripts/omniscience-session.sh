#!/bin/bash

# ============================================================
# Omniscience — скрипт запуска сессии
# Путь к проекту читается из /etc/omniscience/project-root
# ============================================================

if [ -f /etc/omniscience/project-root ]; then
  PROJECT_ROOT="$(cat /etc/omniscience/project-root)"
fi
PROJECT_ROOT="${PROJECT_ROOT:-$HOME/The_Omniscience}"

if [ ! -f "$PROJECT_ROOT/package.json" ]; then
  echo "Omniscience не найден в $PROJECT_ROOT" > /tmp/omniscience-error.log
  exit 1
fi

cd "$PROJECT_ROOT"

export XDG_SESSION_TYPE=x11
export XDG_CURRENT_DESKTOP=KDE
export KDE_SESSION_VERSION=5
export OMNISCIENCE_SESSION=1

# ============================================================
# Утилиты ожидания
# ============================================================

# Ждёт, пока команда вернёт успех. Максимум — timeout секунд.
# Опрос каждые 100мс, без фиксированных sleep-ов.
wait_until() {
  local timeout="$1"; shift
  local deadline=$(( $(date +%s) + timeout ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    "$@" >/dev/null 2>&1 && return 0
    sleep 0.1
  done
  return 1
}

# Проверяет, что процесс пережил initial_timeout секунд.
# Если умер — возвращает 1. Это защита от демонов, которые крашатся сразу.
check_alive() {
  local pid="$1"
  local timeout="${2:-2}"
  local deadline=$(( $(date +%s) + timeout ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    kill -0 "$pid" 2>/dev/null || return 1
    sleep 0.2
  done
  return 0
}

# ============================================================
# 1. dbus
# ============================================================
if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  eval "$(dbus-launch --sh-syntax)"
  export DBUS_SESSION_BUS_ADDRESS
  export DBUS_SESSION_BUS_PID
fi

wait_until 5 dbus-send --session --print-reply \
  --dest=org.freedesktop.DBus / org.freedesktop.DBus.Peer.Ping \
  || echo "[session] ⚠  dbus не отвечает" >&2

# ============================================================
# 2. X-сервер
# ============================================================
wait_until 10 xdpyinfo || echo "[session] ⚠  X не отвечает" >&2

# ============================================================
# 3. Фоновые демоны
# ============================================================

xsettingsd >/dev/null 2>&1 &
XS_PID=$!
check_alive "$XS_PID" 2 || echo "[session] ⚠  xsettingsd упал" >&2

# Находим kglobalacceld: сначала в PATH, потом по типичному пути
KGACLD="$(command -v kglobalacceld 2>/dev/null || echo /usr/lib/kglobalacceld)"
"$KGACLD" >/dev/null 2>&1 &
KGA_PID=$!
check_alive "$KGA_PID" 2 || echo "[session] ⚠  kglobalacceld упал" >&2

nm-applet --sm-disable >/dev/null 2>&1 &
NM_PID=$!

blueman-applet >/dev/null 2>&1 &
BT_PID=$!

# ============================================================
# 4. Раскладка клавиатуры
# ============================================================
# shellcheck disable=SC1091
source /etc/omniscience/keyboard.conf
setxkbmap -layout "$LAYOUTS" -option "$OPTIONS" 2>/dev/null || true

# ============================================================
# 5. xrandr — максимальная частота монитора
# ============================================================
wait_until 5 sh -c 'xrandr --query | grep -q " connected"' || true

PRIMARY_OUT=$(xrandr --query 2>/dev/null | grep ' connected primary' | awk '{print $1}')
[ -z "$PRIMARY_OUT" ] && PRIMARY_OUT=$(xrandr --query 2>/dev/null | grep ' connected' | head -1 | awk '{print $1}')

if [ -n "$PRIMARY_OUT" ]; then
  MODE_LINE=$(xrandr --query | awk -v out="$PRIMARY_OUT" '
    $0 ~ "^"out" connected" { found=1; next }
    found && /^[[:space:]]*[0-9]/ { print; exit }
  ')
  if [ -n "$MODE_LINE" ]; then
    RES=$(echo "$MODE_LINE" | awk '{print $1}')
    MAX_RATE=$(echo "$MODE_LINE" | grep -oE '[0-9]+\.[0-9]+' | sort -rn | head -1)
    if [ -n "$RES" ] && [ -n "$MAX_RATE" ]; then
      xrandr --output "$PRIMARY_OUT" --mode "$RES" --rate "$MAX_RATE" 2>/dev/null || true
      MAX_RATE_INT=${MAX_RATE%.*}
      [ -n "$MAX_RATE_INT" ] && export KWIN_X11_REFRESH_RATE=$((MAX_RATE_INT * 1000))
    fi
  fi
fi

# ============================================================
# 6. KWin
# ============================================================
mkdir -p "$HOME/.config"
cp -f /etc/omniscience/kwinrc "$HOME/.config/kwinrc"
cp -f /etc/omniscience/kwinrulesrc "$HOME/.config/kwinrulesrc"

kwin_x11 --replace >/dev/null 2>&1 &
KWIN_PID=$!

# Ждём, пока KWin станет оконным менеджером (это не мгновенно)
wait_until 10 wmctrl -m || echo "[session] ⚠  KWin не запустился" >&2

# ============================================================
# 7. Omniscience
# ============================================================
npx electron . &
OMNI_PID=$!

# ============================================================
# 8. Strut (резервирование 72px сверху под панель)
# ============================================================
WIN_ID=""
deadline=$(( $(date +%s) + 15 ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  WIN_ID=$(xdotool search --class "The_Omniscience" 2>/dev/null | head -1)
  [ -z "$WIN_ID" ] && WIN_ID=$(wmctrl -l -x 2>/dev/null | grep -i omniscience | awk '{print $1}' | head -1)
  [ -n "$WIN_ID" ] && break
  sleep 0.2
done

if [ -n "$WIN_ID" ]; then
  SCREEN_W=$(xrandr --current | grep '\*' | awk '{print $1}' | cut -d'x' -f1)
  xprop -id "$WIN_ID" -f _NET_WM_STRUT_PARTIAL 32c \
    -set _NET_WM_STRUT_PARTIAL "0, 0, 72, 0, 0, 0, 0, 0, 0, $((SCREEN_W - 1)), 0, 0" \
    2>/dev/null || true
  echo "[session] strut установлен для окна $WIN_ID"
else
  echo "[session] ⚠  не удалось найти окно Omniscience" >&2
fi

# ============================================================
# 9. Ждём завершения Omniscience
# ============================================================
wait "$OMNI_PID"

# ============================================================
# 10. Уборка
# ============================================================
kill "$KWIN_PID" "$NM_PID" "$BT_PID" "$XS_PID" "$KGA_PID" 2>/dev/null || true