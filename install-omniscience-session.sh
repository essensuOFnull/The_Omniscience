#!/bin/bash

OMNI_ROOT="${1:-$PWD}"

if [ ! -f "$OMNI_ROOT/package.json" ]; then
  echo "❌ Запустите скрипт из папки проекта или укажите путь:"
  echo "   ./install-omniscience-session.sh /путь/к/The_Omniscience"
  exit 1
fi

echo "📦 Проект: $OMNI_ROOT"

# --- 1. Дистрибутив ---
if [ -f /etc/os-release ]; then
  . /etc/os-release
  DISTRO="$ID"
else
  echo "❌ Не удалось определить дистрибутив"
  exit 1
fi
echo "🐧 Дистрибутив: $DISTRO"

# --- 2. Пакеты ---
install_packages() {
  case "$DISTRO" in
    ubuntu|debian|parrot|kali|linuxmint|pop)
      sudo apt update && sudo apt install -y \
        kwin-x11 dbus-x11 x11-xserver-utils wmctrl xdotool \
        x11-xkb-utils x11-utils xdpyinfo \
        kglobalaccel5 \
        network-manager network-manager-applet \
        bluez blueman \
        xsettingsd
      ;;
    arch|manjaro|endeavouros|garuda)
      sudo pacman -S --noconfirm --needed \
        kwin-x11 dbus xorg-xrandr wmctrl xdotool \
        xorg-setxkbmap xorg-xprop xorg-xdpyinfo \
        kglobalacceld \
        networkmanager network-manager-applet \
        bluez bluez-utils blueman \
        xsettingsd
      ;;
    fedora|rhel|centos)
      sudo dnf install -y \
        kwin dbus-x11 xrandr wmctrl xdotool \
        xkbcomp xkeyboard-config xprop xdpyinfo \
        kglobalaccel \
        NetworkManager network-manager-applet \
        bluez blueman \
        xsettingsd
      ;;
    opensuse*|sles)
      sudo zypper install -y \
        kwin dbus-1-x11 xrandr wmctrl xdotool \
        xkeyboard-config xprop xdpyinfo \
        kglobalaccel \
        NetworkManager NetworkManager-applet \
        bluez blueman \
        xsettingsd
      ;;
    void)
      sudo xbps-install -y \
        kwin dbus xrandr wmctrl xdotool \
        setxkbmap xprop xdpyinfo \
        kglobalaccel \
        NetworkManager network-manager-applet \
        bluez blueman \
        xsettingsd
      ;;
    alpine)
      sudo apk add \
        kwin dbus xrandr wmctrl xdotool \
        xkeyboard-config xprop xdpyinfo \
        networkmanager network-manager-applet \
        bluez blueman \
        xsettingsd
      ;;
    gentoo)
      sudo emerge \
        kde-plasma/kwin sys-apps/dbus x11-apps/xrandr \
        x11-misc/wmctrl x11-misc/xdotool \
        x11-misc/setxkbmap x11-apps/xprop x11-apps/xdpyinfo \
        kde-plasma/kglobalacceld \
        net-misc/networkmanager gnome-extra/nm-applet \
        net-wireless/bluez net-wireless/blueman \
        x11-misc/xsettingsd
      ;;
    *)
      echo "❌ Неизвестный дистрибутив: $DISTRO"
      echo "   Установите вручную: kwin-x11, dbus, xrandr, wmctrl, xdotool,"
      echo "   setxkbmap, xprop, xdpyinfo, kglobalacceld,"
      echo "   NetworkManager, nm-applet, bluez, blueman, xsettingsd"
      exit 1
      ;;
  esac
}

if [ "$2" != "--skip-packages" ]; then
  echo "📥 Устанавливаю пакеты..."
  install_packages || exit 1
else
  echo "⏭  Пропускаю установку пакетов"
fi

# --- 3. Сочетания клавиш ---
echo ""
echo "⌨️  Установить общепринятые сочетания клавиш?"
echo "   (Meta+Enter — терминал, Meta+E — файлы, Meta+D — показать стол, ...)"
read -rp "Установить сочетания? [Y/n]: " INSTALL_SHORTCUTS
INSTALL_SHORTCUTS="${INSTALL_SHORTCUTS:-Y}"

if [[ "$INSTALL_SHORTCUTS" =~ ^[Yy]$ ]]; then
  if [ -f "$OMNI_ROOT/scripts/install-shortcuts.sh" ]; then
    bash "$OMNI_ROOT/scripts/install-shortcuts.sh" || \
      echo "⚠️  install-shortcuts.sh завершился с ошибкой, продолжаю"
  else
    echo "⚠️  scripts/install-shortcuts.sh не найден, пропускаю"
  fi
fi

# --- 4. Конфиг KWin ---
echo "📝 Создаю конфиг KWin..."
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

# --- 5. Конфиг раскладки ---
echo "📝 Создаю конфиг раскладки..."
sudo tee /etc/omniscience/keyboard.conf > /dev/null << 'EOF'
LAYOUTS="us,ru"
OPTIONS="grp:alt_shift_toggle,grp_led:scroll"
EOF

# --- 6. Путь к проекту ---
echo "📝 Записываю путь к проекту..."
echo "$OMNI_ROOT" | sudo tee /etc/omniscience/project-root > /dev/null

# --- 7. Скрипт сессии ---
echo "📝 Устанавливаю скрипт сессии..."
if [ ! -f "$OMNI_ROOT/scripts/omniscience-session.sh" ]; then
  echo "❌ scripts/omniscience-session.sh не найден в проекте"
  exit 1
fi
sudo cp "$OMNI_ROOT/scripts/omniscience-session.sh" /usr/local/bin/omniscience-session
sudo chmod +x /usr/local/bin/omniscience-session

# --- 8. Файл сессии ---
echo "📝 Регистрирую сессию..."
sudo mkdir -p /usr/share/xsessions
sudo rm -f /usr/share/xsessions/omniscience-x11.desktop
sudo rm -f /usr/share/xsessions/omniscience-openbox.desktop
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
echo "✅ Готово!"
echo ""
echo "Что установлено:"
echo "  • kwin-x11         — композитор"
echo "  • kglobalacceld    — глобальные горячие клавиши"
echo "  • dbus             — системная шина"
echo "  • xrandr           — авто-частота монитора"
echo "  • wmctrl + xdotool — управление окнами"
echo "  • NetworkManager   — Wi-Fi"
echo "  • bluez + blueman  — Bluetooth"
echo "  • xsettingsd       — настройки X11"
echo "  • setxkbmap        — раскладка клавиатуры"
echo ""
echo "Сессия зарегистрирована. Выйди и выбери «Omniscience»."
echo ""