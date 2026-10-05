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
        x11-xkb-utils x11-utils xdpyinfo x11-xserver-utils \
        kglobalacceld \
        network-manager network-manager-applet \
        xsettingsd systemsettings \
        pipewire pipewire-pulse pipewire-jack pipewire-alsa wireplumber \
        libspa-0.2-bluetooth \
        easyeffects lsp-plugins-lv2 lsp-plugins-vst \
        bluedevil plasma-pa qpwgraph \
        curl git
      ;;
    arch|manjaro|endeavouros|garuda)
      sudo pacman -S --needed \
        kwin-x11 dbus xorg-xrandr wmctrl xdotool \
        xorg-setxkbmap xorg-xprop xorg-xdpyinfo \
        kglobalacceld \
        networkmanager network-manager-applet \
        xsettingsd systemsettings \
        pipewire pipewire-pulse pipewire-jack pipewire-alsa wireplumber \
        easyeffects lsp-plugins calf \
        bluedevil plasma-pa qpwgraph \
        curl git
      ;;
    fedora|rhel|centos)
      sudo dnf install -y \
        kwin dbus-x11 xrandr wmctrl xdotool \
        xkbcomp xkeyboard-config xprop xdpyinfo \
        kglobalacceld \
        NetworkManager network-manager-applet \
        xsettingsd systemsettings \
        pipewire pipewire-pulseaudio pipewire-jack-audio-connection-kit pipewire-alsa \
        wireplumber easyeffects lsp-plugins \
        bluedevil plasma-pa qpwgraph \
        curl git
      ;;
    opensuse*|sles)
      sudo zypper install -y \
        kwin6-x11 dbus-1-x11 xrandr wmctrl xdotool \
        xkeyboard-config xprop xdpyinfo \
        kglobalacceld6 \
        NetworkManager NetworkManager-applet \
        xsettingsd systemsettings6 \
        pipewire pipewire-pulseaudio pipewire-jack pipewire-alsa \
        wireplumber easyeffects lsp-plugins \
        bluedevil6 plasma6-pa qpwgraph \
        curl git
      ;;
    void)
      sudo xbps-install -y \
        kwin-x11 dbus xrandr wmctrl xdotool \
        setxkbmap xprop xdpyinfo \
        kglobalacceld \
        NetworkManager network-manager-applet \
        xsettingsd systemsettings \
        pipewire pipewire-pulse libjack-pipewire wireplumber \
        easyeffects lsp-plugins \
        bluedevil plasma-pa qpwgraph \
        curl git
      ;;
    alpine)
      sudo apk add \
        kwin dbus xrandr wmctrl xdotool \
        xkeyboard-config xprop xdpyinfo \
        kglobalacceld \
        networkmanager network-manager-applet \
        xsettingsd systemsettings \
        pipewire pipewire-pulse pipewire-jack wireplumber \
        easyeffects lsp-plugins \
        bluedevil plasma-pa qpwgraph \
        curl git
      ;;
    gentoo)
      sudo emerge \
        kde-plasma/kwin-x11 sys-apps/dbus x11-apps/xrandr \
        x11-misc/wmctrl x11-misc/xdotool \
        x11-misc/setxkbmap x11-apps/xprop x11-apps/xdpyinfo \
        kde-plasma/kglobalacceld \
        net-misc/networkmanager gnome-extra/nm-applet \
        x11-misc/xsettingsd kde-plasma/systemsettings \
        media-video/pipewire media-sound/wireplumber \
        media-sound/easyeffects media-plugins/lsp-plugins \
        kde-plasma/bluedevil kde-plasma/plasma-pa media-sound/qpwgraph \
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

# --- Конфиги ---
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

sudo tee /etc/omniscience/keyboard.conf > /dev/null << 'EOF'
LAYOUTS="us,ru"
OPTIONS="grp:alt_shift_toggle,grp_led:scroll"
EOF

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

# --- EasyEffects как user-сервис (единственный systemd-юнит) ---
echo "📝 Устанавливаю EasyEffects user-сервис..."
mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/easyeffects.service" << 'EOF'
[Unit]
Description=EasyEffects Service
After=pipewire.service
Wants=pipewire.service

[Service]
Type=dbus
BusName=com.github.wwmm.easyeffects
ExecStart=/usr/bin/easyeffects --service-mode
Restart=on-failure

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload 2>/dev/null || true

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
echo "📋 Если сессия падает — лог здесь: /tmp/omniscience-session.log"
echo "   Смотри так: cat /tmp/omniscience-session.log"