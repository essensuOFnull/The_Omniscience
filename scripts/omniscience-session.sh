#!/bin/bash
# scripts/omniscience-session.sh
# Сессия Omniscience: X11 -> KDE-демоны -> KWin -> Electron -> автозагрузка -> сервисы.
# Целевая платформа: Plasma 6 + systemd --user.
# set -e НЕ используется — падение отдельного шага не должно убивать сессию.

# ============================================================
# 0. БАЗОВЫЕ ПУТИ
# ============================================================
PROJECT_ROOT="$(cat /etc/omniscience/project-root 2>/dev/null || pwd)"

if [ ! -f "$PROJECT_ROOT/package.json" ]; then
  echo "Omniscience не найден в $PROJECT_ROOT" | tee /tmp/omniscience-error.log
  exit 1
fi

LOG="/tmp/omniscience-session.log"
exec > >(tee -a "$LOG") 2>&1

log() { echo "[session] $*"; }
die() { echo "[session] ❌ $*" | tee -a /tmp/omniscience-error.log; exit 1; }

log "===== Старт сессии $(date) ====="
log "PROJECT_ROOT=$PROJECT_ROOT"

cd "$PROJECT_ROOT" || exit 1

# ============================================================
# САМО-ВОССТАНОВЛЕНИЕ
# /usr/local/bin/omniscience-session — установочная копия. Если в
# репозитории лежит более свежая версия — переключаемся на неё.
# sudo без пароля: обновляем bin. Иначе — просто exec из репо.
# ============================================================
SELF_PATH="$(readlink -f "$0")"
CANONICAL="$PROJECT_ROOT/scripts/omniscience-session.sh"
INSTALL_PATH="/usr/local/bin/omniscience-session"

if [ -f "$CANONICAL" ] && [ "$SELF_PATH" != "$(readlink -f "$CANONICAL")" ]; then
  SELF_MD5="$(md5sum "$SELF_PATH"  2>/dev/null | awk '{print $1}')"
  CANON_MD5="$(md5sum "$CANONICAL" 2>/dev/null | awk '{print $1}')"
  if [ "$SELF_MD5" != "$CANON_MD5" ]; then
    log "⚠️  bin устарел ($SELF_MD5 ≠ $CANON_MD5)"
    [ -x "$CANONICAL" ] || chmod +x "$CANONICAL" 2>/dev/null || true
    if sudo -n cp -f "$CANONICAL" "$INSTALL_PATH" 2>/dev/null \
       && sudo -n chmod +x "$INSTALL_PATH" 2>/dev/null; then
      log "🔄 bin обновлён, exec $INSTALL_PATH"
      exec "$INSTALL_PATH" "$@"
    else
      log "🔄 sudo без пароля недоступен, exec из репо: $CANONICAL"
      exec "$CANONICAL" "$@"
    fi
  fi
fi

# ============================================================
# 1. ОКРУЖЕНИЕ
# ============================================================
export XDG_SESSION_TYPE=x11
export XDG_CURRENT_DESKTOP=KDE
export XDG_SESSION_DESKTOP=omniscience
export KDE_SESSION_VERSION=6
export DESKTOP_SESSION=omniscience
export OMNISCIENCE_SESSION=1

if [ -z "${XDG_RUNTIME_DIR:-}" ]; then
  export XDG_RUNTIME_DIR="/run/user/$(id -u)"
fi
log "XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR"

# --- D-Bus: единственная шина — user-bus от systemd ---
USER_BUS="$XDG_RUNTIME_DIR/bus"
[ -S "$USER_BUS" ] || die "Нет сокета $USER_BUS — systemd --user не поднят"
export DBUS_SESSION_BUS_ADDRESS="unix:path=$USER_BUS"
log "DBus: $DBUS_SESSION_BUS_ADDRESS"

systemctl --user is-system-running >/dev/null 2>&1 \
  || die "systemd --user не отвечает"

systemctl --user set-environment \
  DISPLAY="$DISPLAY" \
  XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}" \
  2>/dev/null || true

dbus-update-activation-environment --systemd \
  DISPLAY XAUTHORITY XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS \
  XDG_SESSION_TYPE XDG_CURRENT_DESKTOP XDG_SESSION_DESKTOP \
  KDE_SESSION_VERSION PATH \
  >/dev/null 2>&1 || true

systemctl --user import-environment \
  DISPLAY XAUTHORITY XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS \
  XDG_SESSION_TYPE XDG_CURRENT_DESKTOP XDG_SESSION_DESKTOP \
  KDE_SESSION_VERSION PATH \
  >/dev/null 2>&1 || true

log "systemd --user DISPLAY:    $(systemctl --user show-environment | grep '^DISPLAY=' || echo 'НЕ ЗАДАН')"
log "systemd --user XAUTHORITY: $(systemctl --user show-environment | grep '^XAUTHORITY=' || echo 'НЕ ЗАДАН')"

# Вспомогалка: дождаться появления имени на сессионной шине
wait_dbus_name() {
  local name="$1" i=0
  while [ $i -lt 50 ]; do
    if dbus-send --session --print-reply \
         --dest=org.freedesktop.DBus /org/freedesktop/DBus \
         org.freedesktop.DBus.NameHasOwner "string:$name" 2>/dev/null \
         | grep -q 'boolean true'; then
      return 0
    fi
    sleep 0.1; i=$((i+1))
  done
  return 1
}

# ============================================================
# TRAP: cleanup срабатывает и при нормальном выходе, и при kill/SIGTERM
# ============================================================
CLEANUP_DONE=0
OMNI_PID=""
KWIN_PID=""
BLUEDEVIL_PID=""
KDE_PIDS=()

cleanup() {
  [ "$CLEANUP_DONE" = "1" ] && return 0
  CLEANUP_DONE=1

  log "Останавливаю сервисы..."

  # ------------------------------------------------------------
  # Electron — первым и с SIGTERM.
  # Ему нужен SIGTERM, чтобы сработал process.on('SIGTERM') в JS
  # и вызвал shutdownAll(): закрыть чужие окна, потом mainWindow,
  # потом app.quit(). Ждём до 2 секунд; если не ответил — SIGKILL.
  # ------------------------------------------------------------
  if [ -n "$OMNI_PID" ] && kill -0 "$OMNI_PID" 2>/dev/null; then
    log "SIGTERM → Electron (PID=$OMNI_PID)"
    kill -TERM "$OMNI_PID" 2>/dev/null || true
    i=0
    while [ $i -lt 20 ] && kill -0 "$OMNI_PID" 2>/dev/null; do
      sleep 0.1; i=$((i+1))
    done
    if kill -0 "$OMNI_PID" 2>/dev/null; then
      log "⚠️  Electron не вышел за 2с — SIGKILL"
      kill -KILL "$OMNI_PID" 2>/dev/null || true
    else
      log "Electron завершился чисто"
    fi
  fi

  # ------------------------------------------------------------
  # EasyEffects и systemsettings
  # ------------------------------------------------------------
  pkill -f 'easyeffects --service-mode' 2>/dev/null || true
  pkill -x systemsettings 2>/dev/null || true

  # ------------------------------------------------------------
  # KDE-демоны и KWin
  # ------------------------------------------------------------
  for pid in "${KDE_PIDS[@]}" "$KWIN_PID" "$BLUEDEVIL_PID"; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  done

  systemctl --user stop plasma-kglobalaccel.service 2>/dev/null || true

  systemctl --user stop pipewire-pulse.service wireplumber.service pipewire.service 2>/dev/null || true
  sudo systemctl stop bluetooth.service 2>/dev/null || true

  log "===== Конец сессии $(date) ====="
}

trap 'cleanup' EXIT
trap 'log "Получен SIGTERM/SIGINT"; exit 0' INT TERM

# ============================================================
# 2. ГЛУШИМ systemd-oomd
# ============================================================
if systemctl list-unit-files systemd-oomd.service >/dev/null 2>&1; then
  systemctl is-active --quiet systemd-oomd 2>/dev/null && \
    { log "Стоп systemd-oomd"; sudo systemctl stop systemd-oomd systemd-oomd.socket 2>/dev/null || true; }
  systemctl is-enabled --quiet systemd-oomd 2>/dev/null && \
    { log "Disable systemd-oomd"; sudo systemctl disable systemd-oomd systemd-oomd.socket 2>/dev/null || true; }
  [ "$(systemctl is-enabled systemd-oomd 2>/dev/null)" != "masked" ] && \
    sudo systemctl mask systemd-oomd systemd-oomd.socket 2>/dev/null || true
fi

# ============================================================
# 3. ОСТАНОВКА СТАРЫХ СЕРВИСОВ
# ============================================================
log "Останавливаю старые сервисы..."

systemctl --user stop pipewire-pulse.service wireplumber.service pipewire.service 2>/dev/null || true
sudo systemctl stop bluetooth.service 2>/dev/null || true

wait_user_unit_stopped() {
  local unit="$1" i=0
  while [ $i -lt 50 ]; do
    systemctl --user is-active --quiet "$unit" 2>/dev/null || return 0
    sleep 0.1; i=$((i+1))
  done
  return 1
}
for u in pipewire-pulse.service wireplumber.service pipewire.service; do
  wait_user_unit_stopped "$u" || true
done

# ============================================================
# 4. KDE-ДЕМОНЫ
# ============================================================
log "Запускаю KDE-демоны..."

command -v kded6 >/dev/null 2>&1 \
  || die "kded6 не найден — установите kf6-kded / plasma-workspace"
kded6 >/dev/null 2>&1 &
KDED_PID=$!
KDE_PIDS+=("$KDED_PID")
log "kded6 (PID=$KDED_PID)"

systemctl --user daemon-reload 2>/dev/null || true
if systemctl --user cat plasma-kglobalaccel.service >/dev/null 2>&1; then
  systemctl --user reset-failed plasma-kglobalaccel.service 2>/dev/null || true
  systemctl --user start plasma-kglobalaccel.service 2>/dev/null \
    || die "Не удалось стартовать plasma-kglobalaccel.service"
  wait_dbus_name org.kde.kglobalaccel \
    || die "kglobalacceld не зарегистрировался на DBus (смотри journalctl --user -u plasma-kglobalaccel)"
  log "kglobalacceld активен (org.kde.kglobalaccel)"
else
  log "⚠️  plasma-kglobalaccel.service не найден — глобальные сочетания работать не будут"
fi

if command -v kactivitymanagerd >/dev/null 2>&1; then
  kactivitymanagerd >/dev/null 2>&1 &
  KAMD_PID=$!
  KDE_PIDS+=("$KAMD_PID")
  log "kactivitymanagerd (PID=$KAMD_PID)"
fi

POLKIT_BIN=""
for b in /usr/lib/*/libexec/polkit-kde-authentication-agent-1 \
         /usr/libexec/polkit-kde-authentication-agent-1 \
         /usr/lib/polkit-kde-authentication-agent-1; do
  [ -x "$b" ] && { POLKIT_BIN="$b"; break; }
done
if [ -n "$POLKIT_BIN" ]; then
  "$POLKIT_BIN" >/dev/null 2>&1 &
  POLKIT_PID=$!
  KDE_PIDS+=("$POLKIT_PID")
  log "polkit-kde-agent (PID=$POLKIT_PID)"
else
  log "⚠️  polkit-kde-agent не найден"
fi

sleep 1

# ============================================================
# 5. KWin
# ============================================================
log "Запускаю KWin..."
mkdir -p "$HOME/.config"
[ -f /etc/omniscience/kwinrc ]      && cp -f /etc/omniscience/kwinrc      "$HOME/.config/kwinrc"
[ -f /etc/omniscience/kwinrulesrc ] && cp -f /etc/omniscience/kwinrulesrc "$HOME/.config/kwinrulesrc"

kwin_x11 --replace &
KWIN_PID=$!
log "KWin (PID=$KWIN_PID)"

i=0
while [ $i -lt 100 ]; do
  if xprop -root _NET_SUPPORTING_WM_CHECK >/dev/null 2>&1; then
    WM_PID_CHECK=$(xprop -root _NET_SUPPORTING_WM_CHECK 2>/dev/null | grep -oE '0x[0-9a-f]+')
    [ -n "$WM_PID_CHECK" ] && { log "KWin активен"; break; }
  fi
  sleep 0.1; i=$((i+1))
done
[ $i -ge 100 ] && log "⚠️  KWin не подтвердил WM, продолжаю"

# ============================================================
# 6. PipeWire (до EasyEffects — он должен видеть сокет)
# ============================================================
systemctl --user start pipewire.service wireplumber.service pipewire-pulse.service 2>/dev/null || true
i=0
while [ $i -lt 50 ]; do
  [ -S "$XDG_RUNTIME_DIR/pipewire-0" ] && break
  sleep 0.1; i=$((i+1))
done

# ============================================================
# 7. Electron
# ============================================================
# Запускаем напрямую через node_modules/.bin/electron, а НЕ через npx.
# Причина: npx — это прослойка-родитель. $! указывает на неё, а не на
# сам Electron. SIGTERM, посланный в cleanup, убивает npx, но дочерний
# Electron остаётся сиротой и продолжает висеть на экране.
# Прямой запуск делает $OMNI_PID настоящим Electron'ом, и SIGTERM
# доходит до process.on('SIGTERM') в mainWindow-модуле.
log "Запускаю Omniscience (Electron)..."
ELECTRON_BIN="$PROJECT_ROOT/node_modules/.bin/electron"
if [ -x "$ELECTRON_BIN" ]; then
  "$ELECTRON_BIN" . &
  OMNI_PID=$!
  log "Electron (PID=$OMNI_PID, bin=$ELECTRON_BIN)"
else
  log "⚠️  $ELECTRON_BIN не найден — откат на npx (сигналы уйдут в прослойку!)"
  npx electron . &
  OMNI_PID=$!
  log "Electron via npx (PID=$OMNI_PID)"
fi

# ============================================================
# 8. bluedevil + системные сервисы
# ============================================================
if command -v bluedevil >/dev/null 2>&1; then
  bluedevil >/dev/null 2>&1 &
  BLUEDEVIL_PID=$!
  log "bluedevil (PID=$BLUEDEVIL_PID)"
fi

sudo systemctl start bluetooth.service 2>/dev/null || true

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
  log "NetworkManager готов"
fi

# ============================================================
# 9. АВТОЗАГРУЗКА (~/.config/autostart/*.desktop, XDG Autostart spec)
# ============================================================
launch_autostart() {
  local dir="$1"
  [ -d "$dir" ] || return 0
  for f in "$dir"/*.desktop; do
    [ -f "$f" ] || continue

    grep -qE '^Hidden=true' "$f" 2>/dev/null && \
      { log "[autostart] skip (Hidden): $(basename "$f")"; continue; }
    grep -qE '^X-KDE-autostart-enabled=false' "$f" 2>/dev/null && \
      { log "[autostart] skip (KDE disabled): $(basename "$f")"; continue; }
    grep -qE '^X-GNOME-Autostart-enabled=false' "$f" 2>/dev/null && \
      { log "[autostart] skip (GNOME disabled): $(basename "$f")"; continue; }

    local exec_line
    exec_line=$(grep -m1 '^Exec=' "$f" | cut -d= -f2-)
    [ -z "$exec_line" ] && { log "[autostart] skip (no Exec): $(basename "$f")"; continue; }

    exec_line=$(printf '%s' "$exec_line" | sed 's/%[uUfFdDnNickvm]//g')

    log "[autostart] launch: $(basename "$f") → $exec_line"
    sh -c "$exec_line" >/dev/null 2>&1 &
  done
}

log "Обрабатываю автозагрузку ~/.config/autostart..."
launch_autostart "$HOME/.config/autostart"

# ============================================================
# 10. ЖДЁМ ELECTRON (cleanup выполнится через trap на EXIT)
# ============================================================
log "Жду завершения Electron..."
wait "$OMNI_PID"

exit 0