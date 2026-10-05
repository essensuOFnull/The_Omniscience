#!/bin/bash
# scripts/omniscience-session.sh
# Сессия Omniscience: X11 -> KWin -> Electron -> сервисы (PipeWire, BT, EE).
# ВАЖНО: set -e НЕ используется, чтобы случайная ошибка не убивала сессию.

PROJECT_ROOT="$(cat /etc/omniscience/project-root 2>/dev/null || pwd)"

if [ ! -f "$PROJECT_ROOT/package.json" ]; then
  echo "Omniscience не найден в $PROJECT_ROOT" | tee /tmp/omniscience-error.log
  exit 1
fi

# Все логи сессии — в файл, чтобы можно было посмотреть, если выкинет
LOG="/tmp/omniscience-session.log"
exec > >(tee -a "$LOG") 2>&1

echo "[session] ===== Старт сессии $(date) ====="
echo "[session] PROJECT_ROOT=$PROJECT_ROOT"

cd "$PROJECT_ROOT" || exit 1

export XDG_SESSION_TYPE=x11
export XDG_CURRENT_DESKTOP=KDE
export KDE_SESSION_VERSION=5
export OMNISCIENCE_SESSION=1

# --- D-Bus ---
if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  if command -v dbus-launch >/dev/null 2>&1; then
    eval "$(dbus-launch --sh-syntax)"
    export DBUS_SESSION_BUS_ADDRESS
    export DBUS_SESSION_BUS_PID
    echo "[session] D-Bus запущен: $DBUS_SESSION_BUS_ADDRESS"
  else
    echo "[session] ⚠️  dbus-launch не найден, сервисы могут не работать"
  fi
fi

# --- XDG_RUNTIME_DIR (нужен для systemctl --user и PipeWire) ---
if [ -z "${XDG_RUNTIME_DIR:-}" ]; then
  export XDG_RUNTIME_DIR="/run/user/$(id -u)"
  echo "[session] XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR"
fi

# Проверяем, доступен ли systemctl --user
USER_SYSTEMD_OK=0
if systemctl --user is-system-running >/dev/null 2>&1; then
  USER_SYSTEMD_OK=1
  echo "[session] systemd --user доступен"
else
  echo "[session] ⚠️  systemd --user недоступен, сервисы будут запускаться вручную"
fi

# ============================================================
# 1. ОСТАНОВКА ВСЕХ СЕРВИСОВ (игнорируем enable)
# ============================================================
echo "[session] Останавливаю старые сервисы..."

stop_user_unit() {
  systemctl --user stop "$1" 2>/dev/null || true
}
stop_system_unit() {
  sudo systemctl stop "$1" 2>/dev/null || true
}

if [ "$USER_SYSTEMD_OK" = "1" ]; then
  stop_user_unit easyeffects.service
  stop_user_unit pipewire-pulse.service
  stop_user_unit wireplumber.service
  stop_user_unit pipewire.service
fi
stop_system_unit bluetooth.service

# Ждём реальной остановки (максимум ~5 секунд)
wait_user_unit_stopped() {
  local unit="$1" i=0
  while [ $i -lt 50 ]; do
    if ! systemctl --user is-active --quiet "$unit" 2>/dev/null; then
      return 0
    fi
    sleep 0.1
    i=$((i+1))
  done
  return 1
}
wait_system_unit_stopped() {
  local unit="$1" i=0
  while [ $i -lt 50 ]; do
    if ! systemctl is-active --quiet "$unit" 2>/dev/null; then
      return 0
    fi
    sleep 0.1
    i=$((i+1))
  done
  return 1
}

if [ "$USER_SYSTEMD_OK" = "1" ]; then
  for u in easyeffects.service pipewire-pulse.service wireplumber.service pipewire.service; do
    wait_user_unit_stopped "$u" || true
  done
fi
wait_system_unit_stopped bluetooth.service || true

# ============================================================
# 2. XRANDR — настройка разрешения до всего остального
# ============================================================
echo "[session] Настраиваю xrandr..."

# Ждём, пока X-сервер будет готов (мы уже внутри него, но на всякий случай)
i=0
while ! xrandr --query >/dev/null 2>&1; do
  sleep 0.1
  i=$((i+1))
  [ $i -ge 50 ] && { echo "[session] ⚠️  xrandr не отвечает"; break; }
done

PRIMARY_OUT=$(xrandr --query 2>/dev/null | grep ' connected primary' | awk '{print $1}')
[ -z "$PRIMARY_OUT" ] && PRIMARY_OUT=$(xrandr --query 2>/dev/null | grep ' connected' | head -1 | awk '{print $1}')

if [ -n "$PRIMARY_OUT" ]; then
  echo "[session] Основной выход: $PRIMARY_OUT"
  MODE_LINE=$(xrandr --query | awk -v out="$PRIMARY_OUT" '
    $0 ~ "^"out" connected" { found=1; next }
    found && /^[[:space:]]*[0-9]/ { print; exit }
  ')
  if [ -n "$MODE_LINE" ]; then
    RES=$(echo "$MODE_LINE" | awk '{print $1}')
    MAX_RATE=$(echo "$MODE_LINE" | grep -oE '[0-9]+\.[0-9]+' | sort -rn | head -1)
    if [ -n "$RES" ] && [ -n "$MAX_RATE" ]; then
      echo "[session] Устанавливаю режим $RES @ $MAX_RATE Hz"
      xrandr --output "$PRIMARY_OUT" --mode "$RES" --rate "$MAX_RATE" 2>/dev/null || true
      MAX_RATE_INT=${MAX_RATE%.*}
      [ -n "$MAX_RATE_INT" ] && export KWIN_X11_REFRESH_RATE=$((MAX_RATE_INT * 1000))
    fi
  fi
fi

# ============================================================
# 3. РАСКЛАДКА
# ============================================================
if [ -f /etc/omniscience/keyboard.conf ]; then
  # shellcheck disable=SC1091
  source /etc/omniscience/keyboard.conf
  setxkbmap -layout "$LAYOUTS" -option "$OPTIONS" 2>/dev/null || true
fi

# ============================================================
# 4. KWin
# ============================================================
echo "[session] Запускаю KWin..."
mkdir -p "$HOME/.config"
[ -f /etc/omniscience/kwinrc ]      && cp -f /etc/omniscience/kwinrc      "$HOME/.config/kwinrc"
[ -f /etc/omniscience/kwinrulesrc ] && cp -f /etc/omniscience/kwinrulesrc "$HOME/.config/kwinrulesrc"

kwin_x11 --replace &
KWIN_PID=$!
echo "[session] KWin PID=$KWIN_PID"

# Ждём, пока KWin реально станет оконным менеджером
i=0
while [ $i -lt 100 ]; do
  if xprop -root _NET_SUPPORTING_WM_CHECK >/dev/null 2>&1; then
    WM_PID_CHECK=$(xprop -root _NET_SUPPORTING_WM_CHECK 2>/dev/null | grep -oE '0x[0-9a-f]+')
    if [ -n "$WM_PID_CHECK" ]; then
      echo "[session] KWin активен"
      break
    fi
  fi
  sleep 0.1
  i=$((i+1))
done
[ $i -ge 100 ] && echo "[session] ⚠️  KWin не подтвердил статус WM, продолжаю"

# ============================================================
# 5. Electron
# ============================================================
echo "[session] Запускаю Omniscience (Electron)..."
npx electron . &
OMNI_PID=$!
echo "[session] Electron PID=$OMNI_PID"

# Ждём окна приложения
WIN_ID=""
i=0
while [ $i -lt 100 ]; do
  WIN_ID=$(xdotool search --class "The_Omniscience" 2>/dev/null | head -1)
  [ -z "$WIN_ID" ] && WIN_ID=$(wmctrl -l -x 2>/dev/null | grep -i omniscience | awk '{print $1}' | head -1)
  [ -n "$WIN_ID" ] && break
  # Если процесс умер — выходим
  if ! kill -0 "$OMNI_PID" 2>/dev/null; then
    echo "[session] ❌ Electron умер, завершаю сессию"
    kill "$KWIN_PID" 2>/dev/null || true
    exit 1
  fi
  sleep 0.2
  i=$((i+1))
done

if [ -n "$WIN_ID" ]; then
  echo "[session] Окно найдено: $WIN_ID"
  SCREEN_W=$(xrandr --current | grep '\*' | awk '{print $1}' | cut -d'x' -f1)
  xprop -id "$WIN_ID" -f _NET_WM_STRUT_PARTIAL 32c \
    -set _NET_WM_STRUT_PARTIAL "0, 0, 72, 0, 0, 0, 0, 0, 0, $((SCREEN_W - 1)), 0, 0" 2>/dev/null || true
else
  echo "[session] ⚠️  Окно Omniscience не найдено"
fi

# ============================================================
# 6. ЗАПУСК СЕРВИСОВ (после Electron)
# ============================================================
echo "[session] Запускаю сервисы..."

# PipeWire — параллельно
if [ "$USER_SYSTEMD_OK" = "1" ]; then
  systemctl --user start pipewire.service wireplumber.service pipewire-pulse.service 2>/dev/null || true

  # Ждём сокет PipeWire
  i=0
  while [ $i -lt 50 ]; do
    [ -S "$XDG_RUNTIME_DIR/pipewire-0" ] && break
    sleep 0.1
    i=$((i+1))
  done
fi

# Bluetooth
sudo systemctl start bluetooth.service 2>/dev/null || true

# EasyEffects
if [ "$USER_SYSTEMD_OK" = "1" ]; then
  systemctl --user start easyeffects.service 2>/dev/null || true
fi

# KDE-демоны — параллельно
bluedevil >/dev/null 2>&1 &
BLUEDEVIL_PID=$!

xsettingsd >/dev/null 2>&1 &
XS_PID=$!

kglobalacceld >/dev/null 2>&1 &
KGA_PID=$!

nm-applet --sm-disable >/dev/null 2>&1 &
NM_PID=$!

# ============================================================
# 7. ЖДЁМ ЗАВЕРШЕНИЯ ELECTRON
# ============================================================
echo "[session] Сессия запущена. Жду завершения Electron..."
wait "$OMNI_PID"

# ============================================================
# 8. ОСТАНОВКА
# ============================================================
echo "[session] Omniscience завершён, останавливаю сервисы..."

kill "$KWIN_PID" "$NM_PID" "$BLUEDEVIL_PID" "$XS_PID" "$KGA_PID" 2>/dev/null || true

if [ "$USER_SYSTEMD_OK" = "1" ]; then
  systemctl --user stop easyeffects.service 2>/dev/null || true
  systemctl --user stop pipewire-pulse.service 2>/dev/null || true
  systemctl --user stop wireplumber.service 2>/dev/null || true
  systemctl --user stop pipewire.service 2>/dev/null || true
fi
sudo systemctl stop bluetooth.service 2>/dev/null || true

echo "[session] ===== Конец сессии $(date) ====="