#!/bin/bash
# scripts/omniscience-session.sh
# Сессия Omniscience: X11 -> KDE-демоны -> KWin -> Electron -> автозагрузка -> сервисы.
# set -e НЕ используется — ошибка не должна убивать сессию.

PROJECT_ROOT="$(cat /etc/omniscience/project-root 2>/dev/null || pwd)"

if [ ! -f "$PROJECT_ROOT/package.json" ]; then
  echo "Omniscience не найден в $PROJECT_ROOT" | tee /tmp/omniscience-error.log
  exit 1
fi

LOG="/tmp/omniscience-session.log"
exec > >(tee -a "$LOG") 2>&1

echo "[session] ===== Старт сессии $(date) ====="
echo "[session] PROJECT_ROOT=$PROJECT_ROOT"

cd "$PROJECT_ROOT" || exit 1

export XDG_SESSION_TYPE=x11
export XDG_CURRENT_DESKTOP=KDE
export KDE_SESSION_VERSION=5
export DESKTOP_SESSION=omniscience
export OMNISCIENCE_SESSION=1

# --- D-Bus ---
if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  if command -v dbus-launch >/dev/null 2>&1; then
    eval "$(dbus-launch --sh-syntax)"
    export DBUS_SESSION_BUS_ADDRESS DBUS_SESSION_BUS_PID
    echo "[session] D-Bus: $DBUS_SESSION_BUS_ADDRESS"
  else
    echo "[session] ⚠️  dbus-launch не найден"
  fi
fi

# --- XDG_RUNTIME_DIR ---
if [ -z "${XDG_RUNTIME_DIR:-}" ]; then
  export XDG_RUNTIME_DIR="/run/user/$(id -u)"
  echo "[session] XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR"
fi

# --- systemd --user ---
USER_SYSTEMD_OK=0
if systemctl --user is-system-running >/dev/null 2>&1; then
  USER_SYSTEMD_OK=1
  echo "[session] systemd --user доступен"
else
  echo "[session] ⚠️  systemd --user недоступен"
fi

# ============================================================
# 0. ГЛУШИМ systemd-oomd
# ============================================================
if systemctl list-unit-files systemd-oomd.service >/dev/null 2>&1; then
  systemctl is-active  --quiet systemd-oomd 2>/dev/null && \
    { echo "[session] Стоп systemd-oomd"; sudo systemctl stop systemd-oomd systemd-oomd.socket 2>/dev/null || true; }
  systemctl is-enabled --quiet systemd-oomd 2>/dev/null && \
    { echo "[session] Disable systemd-oomd"; sudo systemctl disable systemd-oomd systemd-oomd.socket 2>/dev/null || true; }
  [ "$(systemctl is-enabled systemd-oomd 2>/dev/null)" != "masked" ] && \
    sudo systemctl mask systemd-oomd systemd-oomd.socket 2>/dev/null || true
fi

# ============================================================
# 1. ОСТАНОВКА СТАРЫХ СЕРВИСОВ
# ============================================================
echo "[session] Останавливаю старые сервисы..."

stop_user_unit() { systemctl --user stop "$1" 2>/dev/null || true; }
stop_system_unit() { sudo systemctl stop "$1" 2>/dev/null || true; }

if [ "$USER_SYSTEMD_OK" = "1" ]; then
  stop_user_unit pipewire-pulse.service
  stop_user_unit wireplumber.service
  stop_user_unit pipewire.service
fi
stop_system_unit bluetooth.service

wait_user_unit_stopped() {
  local unit="$1" i=0
  while [ $i -lt 50 ]; do
    systemctl --user is-active --quiet "$unit" 2>/dev/null || return 0
    sleep 0.1; i=$((i+1))
  done
  return 1
}
wait_system_unit_stopped() {
  local unit="$1" i=0
  while [ $i -lt 50 ]; do
    systemctl is-active --quiet "$unit" 2>/dev/null || return 0
    sleep 0.1; i=$((i+1))
  done
  return 1
}

if [ "$USER_SYSTEMD_OK" = "1" ]; then
  for u in pipewire-pulse.service wireplumber.service pipewire.service; do
    wait_user_unit_stopped "$u" || true
  done
fi
wait_system_unit_stopped bluetooth.service || true

# ============================================================
# 2. KDE-ДЕМОНЫ
# ============================================================
echo "[session] Запускаю KDE-демоны..."

KDED_BIN=""
for b in kded6 kded5 kded; do
  command -v "$b" >/dev/null 2>&1 && { KDED_BIN="$b"; break; }
done
if [ -n "$KDED_BIN" ]; then
  "$KDED_BIN" >/dev/null 2>&1 &
  KDED_PID=$!
  echo "[session] $KDED_BIN (PID=$KDED_PID)"
else
  KDED_PID=""; echo "[session] ⚠️  kded не найден"
fi

if command -v kglobalacceld >/dev/null 2>&1; then
  kglobalacceld >/dev/null 2>&1 &
  KGA_PID=$!
  echo "[session] kglobalacceld (PID=$KGA_PID)"
else
  KGA_PID=""
fi

if command -v kactivitymanagerd >/dev/null 2>&1; then
  kactivitymanagerd >/dev/null 2>&1 &
  KAMD_PID=$!
  echo "[session] kactivitymanagerd (PID=$KAMD_PID)"
else
  KAMD_PID=""
fi

POLKIT_BIN=""
for b in /usr/lib/*/libexec/polkit-kde-authentication-agent-1 \
         /usr/libexec/polkit-kde-authentication-agent-1 \
         /usr/lib/polkit-kde-authentication-agent-1; do
  [ -x "$b" ] && { POLKIT_BIN="$b"; break; }
done
[ -z "$POLKIT_BIN" ] && command -v polkit-kde-authentication-agent-1 >/dev/null 2>&1 && \
  POLKIT_BIN="polkit-kde-authentication-agent-1"
if [ -n "$POLKIT_BIN" ]; then
  "$POLKIT_BIN" >/dev/null 2>&1 &
  POLKIT_PID=$!
  echo "[session] polkit-kde-agent (PID=$POLKIT_PID)"
else
  POLKIT_PID=""; echo "[session] ⚠️  polkit-kde-agent не найден"
fi

sleep 1

# ============================================================
# 3. KWin
# ============================================================
echo "[session] Запускаю KWin..."
mkdir -p "$HOME/.config"
[ -f /etc/omniscience/kwinrc ]      && cp -f /etc/omniscience/kwinrc      "$HOME/.config/kwinrc"
[ -f /etc/omniscience/kwinrulesrc ] && cp -f /etc/omniscience/kwinrulesrc "$HOME/.config/kwinrulesrc"

kwin_x11 --replace &
KWIN_PID=$!
echo "[session] KWin (PID=$KWIN_PID)"

i=0
while [ $i -lt 100 ]; do
  if xprop -root _NET_SUPPORTING_WM_CHECK >/dev/null 2>&1; then
    WM_PID_CHECK=$(xprop -root _NET_SUPPORTING_WM_CHECK 2>/dev/null | grep -oE '0x[0-9a-f]+')
    [ -n "$WM_PID_CHECK" ] && { echo "[session] KWin активен"; break; }
  fi
  sleep 0.1; i=$((i+1))
done
[ $i -ge 100 ] && echo "[session] ⚠️  KWin не подтвердил WM, продолжаю"

# ============================================================
# 4. PipeWire (до EasyEffects — EasyEffects должен видеть сокет)
# ============================================================
if [ "$USER_SYSTEMD_OK" = "1" ]; then
  systemctl --user start pipewire.service wireplumber.service pipewire-pulse.service 2>/dev/null || true
  i=0
  while [ $i -lt 50 ]; do
    [ -S "$XDG_RUNTIME_DIR/pipewire-0" ] && break
    sleep 0.1; i=$((i+1))
  done
fi

# ============================================================
# 5. Electron
# ============================================================
echo "[session] Запускаю Omniscience (Electron)..."
npx electron . &
OMNI_PID=$!
echo "[session] Electron (PID=$OMNI_PID)"

# ============================================================
# 6. bluedevil + системные сервисы
# ============================================================
if command -v bluedevil >/dev/null 2>&1; then
  bluedevil >/dev/null 2>&1 &
  BLUEDEVIL_PID=$!
  echo "[session] bluedevil (PID=$BLUEDEVIL_PID)"
else
  BLUEDEVIL_PID=""
fi

sudo systemctl start bluetooth.service 2>/dev/null || true

# NetworkManager
if ! systemctl is-active --quiet NetworkManager 2>/dev/null; then
  sudo systemctl start NetworkManager 2>/dev/null || true
fi
command -v rfkill >/dev/null 2>&1 && sudo rfkill unblock wifi 2>/dev/null || true
if command -v nmcli >/dev/null 2>&1; then
  i=0
  while [ $i -lt 50 ]; do
    nmcli -t -f STATE general status 2>/dev/null | grep -qE "^(connected|disconnected|connecting)$" && break
    sleep 0.1; i=$((i+1))
  done
  nmcli radio wifi on 2>/dev/null || true
  echo "[session] NetworkManager готов"
fi

# ============================================================
# 7. АВТОЗАГРУЗКА KDE (~/.config/autostart/*.desktop)
# ============================================================
# Парсим .desktop-файлы как того требует XDG Autostart spec.
# Пропускаем Hidden=true, X-KDE-autostart-enabled=false,
# X-GNOME-Autostart-enabled=false. Запускаем всё остальное.
launch_autostart() {
  local dir="$1"
  [ -d "$dir" ] || return 0
  for f in "$dir"/*.desktop; do
    [ -f "$f" ] || continue

    if grep -qE '^Hidden=true' "$f" 2>/dev/null; then
      echo "[autostart] skip (Hidden): $(basename "$f")"
      continue
    fi
    if grep -qE '^X-KDE-autostart-enabled=false' "$f" 2>/dev/null; then
      echo "[autostart] skip (KDE disabled): $(basename "$f")"
      continue
    fi
    if grep -qE '^X-GNOME-Autostart-enabled=false' "$f" 2>/dev/null; then
      echo "[autostart] skip (GNOME disabled): $(basename "$f")"
      continue
    fi

    local exec_line
    exec_line=$(grep -m1 '^Exec=' "$f" | cut -d= -f2-)
    [ -z "$exec_line" ] && { echo "[autostart] skip (no Exec): $(basename "$f")"; continue; }

    # убираем field codes (%u %U %f %F %d %D %n %N %i %c %k %v %m)
    exec_line=$(printf '%s' "$exec_line" | sed 's/%[uUfFdDnNickvm]//g')

    echo "[autostart] launch: $(basename "$f") → $exec_line"
    sh -c "$exec_line" >/dev/null 2>&1 &
  done
}

echo "[session] Обрабатываю автозагрузку ~/.config/autostart..."
launch_autostart "$HOME/.config/autostart"

# ============================================================
# 8. ЖДЁМ ELECTRON
# ============================================================
echo "[session] Жду завершения Electron..."
wait "$OMNI_PID"

# ============================================================
# 9. ОСТАНОВКА
# ============================================================
echo "[session] Omniscience завершён, останавливаю сервисы..."

# Убиваем автозапущенные процессы по имени (best-effort)
pkill -f 'easyeffects --service-mode' 2>/dev/null || true
pkill -x systemsettings 2>/dev/null || true

for pid in "$KWIN_PID" "$KDED_PID" "$KAMD_PID" "$POLKIT_PID" "$KGA_PID" "$BLUEDEVIL_PID"; do
  [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
done

if [ "$USER_SYSTEMD_OK" = "1" ]; then
  systemctl --user stop pipewire-pulse.service 2>/dev/null || true
  systemctl --user stop wireplumber.service 2>/dev/null || true
  systemctl --user stop pipewire.service 2>/dev/null || true
fi
sudo systemctl stop bluetooth.service 2>/dev/null || true

echo "[session] ===== Конец сессии $(date) ====="