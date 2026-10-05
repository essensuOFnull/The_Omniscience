#!/bin/bash
# install-omniscience-session.sh
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

install_packages() {
  case "$DISTRO" in
    ubuntu|debian|parrot|kali|linuxmint|pop)
      sudo apt update && sudo apt install -y \
        kwin-x11 dbus-x11 x11-xserver-utils wmctrl xdotool \
        x11-xkb-utils x11-utils xdpyinfo \
        kglobalacceld kded5 kactivitymanagerd \
        polkit-kde-agent-1 \
        kscreen powerdevil kde-config-gtk-style \
        kio kio-extras \
        plasma-pa plasma-nm \
        plasma-workspace \
        bluedevil qpwgraph \
        systemsettings \
        pipewire pipewire-pulse pipewire-jack pipewire-alsa wireplumber \
        libspa-0.2-bluetooth \
        easyeffects lsp-plugins-lv2 lsp-plugins-vst \
        curl git
      ;;
    arch|manjaro|endeavouros|garuda)
      sudo pacman -S --needed \
        kwin-x11 dbus xorg-xrandr wmctrl xdotool \
        xorg-setxkbmap xorg-xprop xorg-xdpyinfo \
        kglobalacceld kded kactivitymanagerd \
        polkit-kde-agent \
        kscreen powerdevil kde-gtk-config \
        kio kio-extras \
        plasma-pa plasma-nm \
        plasma-workspace \
        bluedevil qpwgraph \
        systemsettings \
        pipewire pipewire-pulse pipewire-jack pipewire-alsa wireplumber \
        easyeffects lsp-plugins calf \
        curl git
      ;;
    fedora|rhel|centos)
      sudo dnf install -y \
        kwin-x11 dbus-x11 xrandr wmctrl xdotool \
        xkbcomp xkeyboard-config xprop xdpyinfo \
        kglobalacceld kf6-kded kactivitymanagerd \
        polkit-kde \
        kscreen powerdevil kde-gtk-config \
        kf6-kio kf6-kio-extras \
        plasma-pa plasma-nm \
        plasma-workspace \
        bluedevil qpwgraph \
        systemsettings \
        pipewire pipewire-pulseaudio pipewire-jack-audio-connection-kit pipewire-alsa \
        wireplumber easyeffects lsp-plugins \
        curl git
      ;;
    opensuse*|sles)
      sudo zypper install -y \
        kwin6-x11 dbus-1-x11 xrandr wmctrl xdotool \
        xkeyboard-config xprop xdpyinfo \
        kglobalacceld6 kded6 kactivitymanagerd6 \
        polkit-kde-agent-1 \
        kscreen6 powerdevil6 kde-gtk-config6 \
        kio6 kio-extras6 \
        plasma6-pa plasma6-nm \
        plasma6-workspace \
        bluedevil6 qpwgraph \
        systemsettings6 \
        pipewire pipewire-pulseaudio pipewire-jack pipewire-alsa \
        wireplumber easyeffects lsp-plugins \
        curl git
      ;;
    void)
      sudo xbps-install -y \
        kwin dbus xrandr wmctrl xdotool \
        setxkbmap xprop xdpyinfo \
        kglobalacceld kded kactivitymanagerd \
        polkit-kde-agent \
        kscreen powerdevil kde-gtk-config \
        kio kio-extras \
        plasma-pa plasma-nm \
        plasma-workspace \
        bluedevil qpwgraph \
        systemsettings \
        pipewire pipewire-pulse libjack-pipewire wireplumber \
        easyeffects lsp-plugins \
        curl git
      ;;
    alpine)
      sudo apk add \
        kwin dbus xrandr wmctrl xdotool \
        xkeyboard-config xprop xdpyinfo \
        kglobalacceld kded kactivitymanagerd \
        polkit-kde-agent \
        kscreen powerdevil kde-gtk-config \
        kio kio-extras \
        plasma-pa plasma-nm \
        plasma-workspace \
        bluedevil qpwgraph \
        systemsettings \
        pipewire pipewire-pulse pipewire-jack wireplumber \
        easyeffects lsp-plugins \
        curl git
      ;;
    gentoo)
      sudo emerge \
        kde-plasma/kwin-x11 sys-apps/dbus x11-apps/xrandr \
        x11-misc/wmctrl x11-misc/xdotool \
        x11-misc/setxkbmap x11-apps/xprop x11-apps/xdpyinfo \
        kde-plasma/kglobalacceld kde-frameworks/kded kde-plasma/kactivitymanagerd \
        kde-plasma/polkit-kde-agent \
        kde-plasma/kscreen kde-plasma/powerdevil kde-misc/kde-gtk-config \
        kde-frameworks/kio kde-apps/kio-extras \
        kde-plasma/plasma-pa kde-plasma/plasma-nm \
        kde-plasma/plasma-workspace \
        kde-plasma/bluedevil media-sound/qpwgraph \
        kde-plasma/systemsettings \
        media-video/pipewire media-sound/wireplumber \
        media-sound/easyeffects media-plugins/lsp-plugins \
        net-misc/curl dev-vcs/git
      ;;
    *)
      echo "❌ Неизвестный дистрибутив: $DISTRO"
      exit 1
      ;;
  esac
}

echo "📥 Устанавливаю пакеты..."
install_packages

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

# --- Автозагрузка KDE (~/.config/autostart) ---
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

cat > "$HOME/.config/autostart/systemsettings.desktop" << 'EOF'
[Desktop Entry]
Type=Application
Name=System Settings
Comment=Настройки системы KDE
Exec=systemsettings
Icon=preferences-system
Terminal=false
X-KDE-autostart-after=kded
EOF

chmod 644 "$HOME/.config/autostart/easyeffects.desktop" \
           "$HOME/.config/autostart/systemsettings.desktop"

# --- Пресеты EasyEffects ---
echo "📥 Устанавливаю пресеты EasyEffects..."
mkdir -p "$HOME/.config/easyeffects/output"
if command -v curl >/dev/null 2>&1; then
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/JackHack96/EasyEffects-Presets/master/install.sh)" \
    || echo "⚠️  Не удалось установить пресеты"
fi

# --- Скрипт сессии ---
if [ ! -f "$OMNI_ROOT/scripts/omniscience-session.sh" ]; then
  echo "❌ scripts/omniscience-session.sh не найден"
  exit 1
fi
sudo cp "$OMNI_ROOT/scripts/omniscience-session.sh" /usr/local/bin/omniscience-session
sudo chmod +x /usr/local/bin/omniscience-session

# --- Регистрация сессии ---
echo "📝 Регистрирую сессию..."
sudo mkdir -p /usr/share/xsessions
sudo rm -f /usr/share/xsessions/omniscience-*.desktop
sudo rm -f /usr/share/wayland-sessions/omniscience-*.desktop

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