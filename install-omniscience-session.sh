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
Enabled=false
[Effect-shadow]
Enabled=false
[Effect-fade]
Enabled=false
[Effect-slide]
Enabled=false

[Plugins]
blurEnabled=false
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

# --- Раскладка через KDE (kxkbrc) ---
echo "📝 Настраиваю раскладку через kxkbrc..."
mkdir -p "$HOME/.config"
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
# Обе программы кладём в ~/.config/autostart — их видит и редактирует
# systemsettings → Автозагрузка и завершение работы.
# Запускает их наш сессионный скрипт (см. launch_autostart в omniscience-session.sh),
# потому что без ksmserver стандартный KDE-автозапуск сам не сработает.
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

# --- Сопутствующие скрипты: копируем в /usr/local/bin только если изменились ---
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

# --- Конфигурация сочетаний клавиш (kglobalacceld) ---
# Вызывается как часть установки сессии — отдельно запускать не нужно.
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
echo "📋 Лог сессии: /tmp/omniscience-session.log"
echo "   Смотреть:  cat /tmp/omniscience-session.log"