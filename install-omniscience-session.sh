#!/bin/bash
# install-omniscience-session.sh
# Установка сессии Omniscience: конфиги KWin, PipeWire, EasyEffects,
# регистрация сессии в DM, установка сопутствующих скриптов.
#
# ВАЖНО: этот скрипт НЕ ставит системные пакеты. Пакеты ставит
# scripts/install-deps.sh — запускай его ПЕРВЫМ.
#
# Скрипт сам вызывает scripts/install-shortcuts.sh в конце — не нужно
# запускать его отдельно.

set -e

OMNI_ROOT="${1:-$PWD}"

if [ ! -f "$OMNI_ROOT/package.json" ]; then
  echo "❌ Запустите скрипт из папки проекта или укажите путь:"
  echo "   ./install-omniscience-session.sh /путь/к/The_Omniscience"
  exit 1
fi

echo "📦 Проект: $OMNI_ROOT"

if [ -f /etc/os-release ]; then
  . /etc/os-release
  DISTRO="$ID"
else
  echo "❌ Не удалось определить дистрибутив"
  exit 1
fi
echo "🐧 Дистрибутив: $DISTRO"

# --- Конфиги KWin ---
echo "📝 Создаю конфиги..."
sudo mkdir -p /etc/omniscience

sudo tee /etc/omniscience/kwinrc > /dev/null << 'EOF'
[Compositing]
Enabled=true
OpenGLIsUnsafe=false
Backend=OpenGL
GLCore=true
HiddenPreviews=5
GlPreferBufferSwap=n
MaxFPS=0
RefreshRate=0
LatencyPolicy=Low
AllowTearing=true

[Effect-blur]
Enabled=true
BlurStrength=10

[Effect-shadow]
Enabled=false
[Effect-fade]
Enabled=false
[Effect-slide]
Enabled=false

[Plugins]
blurEnabled=true
contrastEnabled=false
kwin4_effect_dimscreenEnabled=false
kwin4_effect_fadeEnabled=false
kwin4_effect_squashEnabled=false
slideEnabled=false
wobblywindowsEnabled=false
zoomEnabled=false

[Desktops]
Number=1
Rows=1
EOF

# Правила окон для /etc-конфига (используется сессией).
sudo tee /etc/omniscience/kwinrulesrc > /dev/null << 'EOF'
[General]
count=1
rules=1

[1]
Description=Omniscience no borders
noborder=true
noborderrule=2
fsplevel=0
fsplevelrule=2
EOF

# Продублируем правило noborder в пользовательский конфиг KWin —
# на случай, если сессия по какой-то причине запускает KWin с
# ~/.config/kwinrc, а не с /etc/omniscience/kwinrc. Правило матчится
# по WM_CLASS, чтобы не влиять на посторонние окна.
mkdir -p "$HOME/.config"
cat > "$HOME/.config/kwinrulesrc" << 'EOF'
[General]
count=1
rules=1

[1]
Description=Omniscience no borders
wmclass=the-omniscience
wmclassmatch=1
noborder=true
noborderrule=2
fsplevel=0
fsplevelrule=2
EOF

# --- Размытие фона для окон Omniscience (X11 + KWin) ---
#
# Используем официальный механизм KDE: свойство _KDE_NET_WM_BLUR_BEHIND_REGION.
# Если оно установлено на окно — KWin штатным эффектом Blur размывает
# всё, что находится за этим окном. Именно так делают Konsole, Yakuake
# и другие приложения KDE.
#
# Electron это свойство сам не ставит. Мы ставим его через xprop,
# подписываясь на изменения списка окон (_NET_CLIENT_LIST) — без поллинга,
# без фоновых циклов, без зависимостей. Работает по X11-событиям.
#
echo "📝 Настраиваю размытие фона для окон Omniscience..."

# 1. Проверяем наличие xprop. xwininfo нам НЕ нужен.
if ! command -v xprop >/dev/null 2>&1; then
  echo "⚠️  xprop не найден. Установите пакет:"
  echo "    Debian/Ubuntu: sudo apt install x11-utils"
  echo "    Arch:          sudo pacman -S xorg-xprop"
  echo "    Fedora:        sudo dnf install xprop"
fi

# 2. Helper — встраиваем в /usr/local/bin прямо отсюда.
sudo tee /usr/local/bin/omniscience-blur > /dev/null << 'HELPER'
#!/bin/bash
# omniscience-blur — вешает _KDE_NET_WM_BLUR_BEHIND_REGION на окна
# The_Omniscience. Работает на X11 через события (xprop -spy),
# без поллинга и без KWin-скриптов.
#
# Логи в /tmp/omniscience-blur.log

set -u

PROP="_KDE_NET_WM_BLUR_BEHIND_REGION"

# Список WM_CLASS-ов окон, которые нужно размывать.
CLASSES="the-omniscience The_Omniscience Omniscience omniscience"

LOG="/tmp/omniscience-blur.log"

log() { echo "[$(date '+%H:%M:%S')] $*" >> "$LOG"; }

have_tools() {
    command -v xprop >/dev/null 2>&1
}

set_blur() {
    local wid="$1"
    local current
    current=$(xprop -id "$wid" "$PROP" 2>/dev/null) || return
    case "$current" in
        *"not found"*|"")
            xprop -id "$wid" -f "$PROP" 32c -set "$PROP" 0 2>/dev/null \
                && log "blur set on $wid"
            ;;
    esac
}

window_matches() {
    local wid="$1"
    local wm_class
    wm_class=$(xprop -id "$wid" WM_CLASS 2>/dev/null) || return 1
    for cls in $CLASSES; do
        case "$wm_class" in
            *"\"$cls\""*) return 0 ;;
        esac
    done
    return 1
}

process_client_list() {
    local list="$1"
    local wid
    for wid in ${list//,/ }; do
        [ -z "$wid" ] && continue
        if window_matches "$wid"; then
            set_blur "$wid"
        fi
    done
}

main() {
    : > "$LOG"
    log "start; classes: $CLASSES"

    if ! have_tools; then
        log "ERROR: xprop missing"
        exit 1
    fi

    local initial
    initial=$(xprop -root _NET_CLIENT_LIST 2>/dev/null | sed 's/.*# //')
    process_client_list "$initial"

    xprop -root -spy _NET_CLIENT_LIST 2>/dev/null | while IFS= read -r line; do
        local list
        list="${line#*# }"
        process_client_list "$list"
    done
}

main
HELPER

sudo chmod +x /usr/local/bin/omniscience-blur

# 3. Автозапуск helper'а через KDE autostart.
cat > "$HOME/.config/autostart/omniscience-blur.desktop" << 'EOF'
[Desktop Entry]
Type=Application
Name=Omniscience Blur
Comment=Размытие фона для окон приложения (X11 + KWin)
Exec=/usr/local/bin/omniscience-blur
Icon=preferences-system-windows-effect-blur
Terminal=false
X-KDE-autostart-after=kwin_x11
EOF
chmod 644 "$HOME/.config/autostart/omniscience-blur.desktop"

# 4. Запускаем helper сейчас.
if pgrep -f "/usr/local/bin/omniscience-blur" >/dev/null 2>&1; then
  pkill -f "/usr/local/bin/omniscience-blur" || true
  sleep 0.3
fi
nohup /usr/local/bin/omniscience-blur >/dev/null 2>&1 &
disown

echo "✅ Размытие настроено. Helper: /usr/local/bin/omniscience-blur"
echo "   Лог: /tmp/omniscience-blur.log"

# 5. Мягко просим KWin перечитать конфиг.
#
#    ВАЖНО: НЕ используем kwin_x11 --replace — он перезапускает KWin
#    без аргумента --config, из-за чего подхватывается дефолтный
#    пользовательский kwinrc с decorations, и рамки окон возвращаются.
#    qdbus reconfigure перечитывает ТЕКУЩИЙ конфиг (тот, с которым KWin
#    уже запущен) — безопасно и без побочных эффектов.
if [ -n "${DISPLAY:-}" ]; then
  echo "🔄 Прошу KWin перечитать конфиг..."
  (qdbus org.kde.KWin /KWin reconfigure 2>/dev/null) \
    || (dbus-send --type=method_call --dest=org.kde.KWin \
           /KWin org.kde.KWin.reconfigure 2>/dev/null) \
    || echo "⚠️  Не удалось перечитать конфиг KWin — изменения применятся после перезахода в сессию"
fi

# --- Раскладка через KDE (kxkbrc) ---
echo "📝 Настраиваю раскладку через kxkbrc..."
cat > "$HOME/.config/kxkbrc" << 'EOF'
[Layout]
DisplayNames=
LayoutList=us,ru
Model=pc105
Options=grp:alt_shift_toggle,grp_led:scroll
Use=true
VariantList=,
EOF

# --- KScreen: максимальное разрешение и частота ---
echo "📝 Настраиваю KScreen на максимальные параметры..."
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
    MAX_RATE_INT=${MAX_RATE%.*}
    RES_W=$(echo "$RES" | cut -d'x' -f1)
    RES_H=$(echo "$RES" | cut -d'x' -f2)

    mkdir -p "$HOME/.local/share/kscreen"
    cat > "$HOME/.local/share/kscreen/$(hostname).json" << EOF
{
    "outputs": {
        "$PRIMARY_OUT": {
            "id": "$PRIMARY_OUT",
            "enabled": true,
            "mode": {
                "size": { "width": $RES_W, "height": $RES_H },
                "refresh": $((MAX_RATE_INT * 1000))
            },
            "position": { "x": 0, "y": 0 },
            "primary": true,
            "scale": 1.0,
            "rotation": "none"
        }
    }
}
EOF
    echo "✅ KScreen настроен: $PRIMARY_OUT → ${RES}@${MAX_RATE}Hz"
  else
    echo "⚠️  Не удалось определить режим для $PRIMARY_OUT"
  fi
else
  echo "⚠️  Не найден подключённый выход — KScreen будет использовать дефолты"
fi

echo "$OMNI_ROOT" | sudo tee /etc/omniscience/project-root > /dev/null

# --- PipeWire 192 kHz ---
echo "📝 Настраиваю PipeWire на 192 kHz..."
mkdir -p "$HOME/.config/pipewire/pipewire.conf.d"
cat > "$HOME/.config/pipewire/pipewire.conf.d/10-sample-rate.conf" << 'EOF'
context.properties = {
  default.clock.allowed-rates = [ 44100 48000 88200 96000 176400 192000 ]
  default.clock.rate = 192000
}
EOF

# --- Автозагрузка KDE ---
echo "📝 Настраиваю автозагрузку (KDE autostart)..."
mkdir -p "$HOME/.config/autostart"

cat > "$HOME/.config/autostart/easyeffects.desktop" << 'EOF'
[Desktop Entry]
Type=Application
Name=EasyEffects
Comment=Аудиоэффекты PipeWire
Exec=easyeffects --service-mode
Icon=easyeffects
Terminal=false
X-KDE-autostart-after=pipewire
EOF

chmod 644 "$HOME/.config/autostart/easyeffects.desktop"

# --- Пресеты EasyEffects ---
echo "📥 Устанавливаю пресеты EasyEffects..."
mkdir -p "$HOME/.config/easyeffects/output"
if command -v curl >/dev/null 2>&1; then
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/JackHack96/EasyEffects-Presets/master/install.sh)" \
    || echo "⚠️  Не удалось установить пресеты"
fi

# --- Сопутствующие скрипты ---
for pair in \
  "scripts/omniscience-session.sh:/usr/local/bin/omniscience-session" \
  "scripts/install-shortcuts.sh:/usr/local/bin/install-shortcuts" ; do
  SRC="$OMNI_ROOT/${pair%%:*}"
  DST="${pair##*:}"
  if [ ! -f "$SRC" ]; then
    echo "❌ Не найден $SRC"
    exit 1
  fi
  if [ ! -f "$DST" ] || [ "$(md5sum "$SRC" | awk '{print $1}')" != "$(md5sum "$DST" | awk '{print $1}')" ]; then
    sudo cp -f "$SRC" "$DST"
    sudo chmod +x "$DST"
    echo "✅ Установлен/обновлён $DST"
  else
    echo "✅ $DST уже актуален"
  fi
done

# --- Конфигурация сочетаний клавиш ---
if [ -x /usr/local/bin/install-shortcuts ]; then
  echo ""
  echo "⌨️  Конфигурирую сочетания клавиш..."
  /usr/local/bin/install-shortcuts
else
  echo "⚠️  /usr/local/bin/install-shortcuts не найден — пропускаю настройку сочетаний"
fi

# --- Регистрация сессии ---
echo ""
echo "📝 Регистрирую сессию..."
sudo mkdir -p /usr/share/xsessions
sudo rm -f /usr/share/xsessions/omniscience-*.desktop
sudo rm -f /usr/share/wayland-sessions/omniscience-*.desktop 2>/dev/null || true

sudo tee /usr/share/xsessions/omniscience.desktop > /dev/null << 'EOF'
[Desktop Entry]
Name=Omniscience
Comment=The Omniscience DE
Exec=/usr/local/bin/omniscience-session
Type=XSession
EOF
sudo chmod 644 /usr/share/xsessions/omniscience.desktop

echo ""
echo "✅ Готово! Сессия зарегистрирована."
echo ""
echo "📋 Лог сессии:      /tmp/omniscience-session.log"
echo "📋 Лог blur-helper: /tmp/omniscience-blur.log"
echo "   Смотреть:  cat /tmp/omniscience-session.log"
echo ""
echo "ℹ️  Если эффект Blur или отсутствие рамок не видны сразу —"
echo "    выйдите из сессии и зайдите снова. KWin подхватит"
echo "    /etc/omniscience/kwinrc при следующем старте."