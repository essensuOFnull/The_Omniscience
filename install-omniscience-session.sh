#!/bin/bash
set -e

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
# Мы НЕ используем lxsession — автозагрузка системы полностью отключена.
# Всё, что нужно, запускается вручную в скрипте сессии.
install_packages() {
  case "$DISTRO" in
    ubuntu|debian|parrot|kali|linuxmint|pop)
      sudo apt update
      sudo apt install -y \
        kwin-x11 dbus-x11 x11-xserver-utils wmctrl xdotool \
        x11-xkb-utils x11-utils \
        kglobalaccel5 \
        network-manager network-manager-applet \
        bluez blueman \
        xsettingsd
      ;;
    arch|manjaro|endeavouros|garuda)
      sudo pacman -S --noconfirm --needed \
        kwin-x11 dbus xorg-xrandr wmctrl xdotool \
        xorg-setxkbmap xorg-xprop \
        kglobalacceld \
        networkmanager network-manager-applet \
        bluez bluez-utils blueman \
        xsettingsd
      ;;
    fedora|rhel|centos)
      sudo dnf install -y \
        kwin dbus-x11 xrandr wmctrl xdotool \
        xkbcomp xkeyboard-config xprop \
        kglobalaccel \
        NetworkManager network-manager-applet \
        bluez blueman \
        xsettingsd
      ;;
    opensuse*|sles)
      sudo zypper install -y \
        kwin dbus-1-x11 xrandr wmctrl xdotool \
        xkeyboard-config xprop \
        kglobalaccel \
        NetworkManager NetworkManager-applet \
        bluez blueman \
        xsettingsd
      ;;
    void)
      sudo xbps-install -y \
        kwin dbus xrandr wmctrl xdotool \
        setxkbmap xprop \
        kglobalaccel \
        NetworkManager network-manager-applet \
        bluez blueman \
        xsettingsd
      ;;
    alpine)
      sudo apk add \
        kwin dbus xrandr wmctrl xdotool \
        xkeyboard-config xprop \
        networkmanager network-manager-applet \
        bluez blueman \
        xsettingsd
      ;;
    gentoo)
      sudo emerge \
        kde-plasma/kwin sys-apps/dbus x11-apps/xrandr \
        x11-misc/wmctrl x11-misc/xdotool \
        x11-misc/setxkbmap x11-apps/xprop \
        kde-plasma/kglobalacceld \
        net-misc/networkmanager gnome-extra/nm-applet \
        net-wireless/bluez net-wireless/blueman \
        x11-misc/xsettingsd
      ;;
    *)
      echo "❌ Неизвестный дистрибутив: $DISTRO"
      echo "   Установите вручную:"
      echo "     kwin-x11, dbus, xrandr, wmctrl, xdotool,"
      echo "     setxkbmap, xprop, kglobalacceld,"
      echo "     NetworkManager, nm-applet, bluez, blueman, xsettingsd"
      echo "   Затем запустите:"
      echo "   ./install-omniscience-session.sh --skip-packages"
      return 1
      ;;
  esac
}

if [ "$2" != "--skip-packages" ]; then
  echo "📥 Устанавливаю пакеты..."
  install_packages || exit 1
else
  echo "⏭  Пропускаю установку пакетов"
fi

# --- 3. Конфиг KWin ---
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

# --- 4. Конфиг раскладки ---
echo "📝 Создаю конфиг раскладки..."
sudo tee /etc/omniscience/keyboard.conf > /dev/null << 'EOF'
# Раскладки и опция переключения.
# Чтобы добавить раскладку — допиши через запятую: us,ru,de
# Чтобы поменять хоткей — см. xkeyboard-config(7), раздел grp:
LAYOUTS="us,ru"
OPTIONS="grp:alt_shift_toggle,grp_led:scroll"
EOF

# --- 5. Скрипт запуска сессии ---
echo "📝 Создаю скрипт запуска..."
sudo tee /usr/local/bin/omniscience-session > /dev/null << EOF
#!/bin/bash
PROJECT_ROOT="$OMNI_ROOT"

if [ ! -f "\$PROJECT_ROOT/package.json" ]; then
  echo "Omniscience не найден в \$PROJECT_ROOT" > /tmp/omniscience-error.log
  exit 1
fi

cd "\$PROJECT_ROOT"

export XDG_SESSION_TYPE=x11
export XDG_CURRENT_DESKTOP=KDE
export KDE_SESSION_VERSION=5
export OMNISCIENCE_SESSION=1

# --- dbus ---
if [ -z "\$DBUS_SESSION_BUS_ADDRESS" ]; then
  eval "\$(dbus-launch --sh-syntax)"
  export DBUS_SESSION_BUS_ADDRESS
  export DBUS_SESSION_BUS_PID
fi

# --- xsettingsd (настройки X11: шрифты, темы, курсоры) ---
xsettingsd >/dev/null 2>&1 &
XS_PID=\$!
sleep 0.3

# --- kglobalacceld (глобальные горячие клавиши, Alt+Shift) ---
kglobalacceld >/dev/null 2>&1 &
KGA_PID=\$!
sleep 0.5

# --- nm-applet (Wi-Fi, работает в фоне) ---
nm-applet --sm-disable >/dev/null 2>&1 &
NM_PID=\$!

# --- blueman-applet (Bluetooth, работает в фоне) ---
blueman-applet >/dev/null 2>&1 &
BT_PID=\$!

# --- Раскладка клавиатуры ---
# shellcheck disable=SC1091
source /etc/omniscience/keyboard.conf
setxkbmap -layout "\$LAYOUTS" -option "\$OPTIONS" 2>/dev/null || true

# --- xrandr: применить максимальную частоту монитора ---
sleep 1
PRIMARY_OUT=\$(xrandr --query | grep ' connected primary' | awk '{print \$1}')
if [ -z "\$PRIMARY_OUT" ]; then
  PRIMARY_OUT=\$(xrandr --query | grep ' connected' | head -1 | awk '{print \$1}')
fi

if [ -n "\$PRIMARY_OUT" ]; then
  MODE_LINE=\$(xrandr --query | awk -v out="\$PRIMARY_OUT" '
    \$0 ~ "^"out" connected" { found=1; next }
    found && /^[[:space:]]*[0-9]/ { print; exit }
  ')
  if [ -n "\$MODE_LINE" ]; then
    RES=\$(echo "\$MODE_LINE" | awk '{print \$1}')
    MAX_RATE=\$(echo "\$MODE_LINE" | grep -oE '[0-9]+\.[0-9]+' | sort -rn | head -1)
    if [ -n "\$RES" ] && [ -n "\$MAX_RATE" ]; then
      xrandr --output "\$PRIMARY_OUT" --mode "\$RES" --rate "\$MAX_RATE" 2>/dev/null || true
      MAX_RATE_INT=\${MAX_RATE%.*}
      if [ -n "\$MAX_RATE_INT" ]; then
        export KWIN_X11_REFRESH_RATE=\$((MAX_RATE_INT * 1000))
      fi
    fi
  fi
fi

# --- KWin ---
mkdir -p "\$HOME/.config"
cp -f /etc/omniscience/kwinrc "\$HOME/.config/kwinrc"
cp -f /etc/omniscience/kwinrulesrc "\$HOME/.config/kwinrulesrc"

kwin_x11 --replace &
KWIN_PID=\$!
sleep 2

# --- Omniscience ---
npx electron . &
OMNI_PID=\$!

# --- Strut: резервируем 72px сверху для панели Omniscience ---
# Ждём, пока окно появится (максимум 10 секунд)
WIN_ID=""
for i in \$(seq 1 20); do
  sleep 0.5
  WIN_ID=\$(xdotool search --class "The_Omniscience" 2>/dev/null | head -1)
  if [ -z "\$WIN_ID" ]; then
    WIN_ID=\$(wmctrl -l -x 2>/dev/null | grep -i omniscience | awk '{print \$1}' | head -1)
  fi
  if [ -n "\$WIN_ID" ]; then break; fi
done

if [ -n "\$WIN_ID" ]; then
  SCREEN_W=\$(xrandr --current | grep '\\*' | awk '{print \$1}' | cut -d'x' -f1)
  xprop -id "\$WIN_ID" -f _NET_WM_STRUT_PARTIAL 32c \\
    -set _NET_WM_STRUT_PARTIAL "0, 0, 72, 0, 0, 0, 0, 0, 0, \$((SCREEN_W - 1)), 0, 0" 2>/dev/null || true
  echo "[session] strut установлен для окна \$WIN_ID"
else
  echo "[session] не удалось найти окно Omniscience для установки strut" >&2
fi

# --- Ждём завершения Omniscience ---
wait \$OMNI_PID

# --- Уборка при выходе ---
kill \$KWIN_PID \$NM_PID \$BT_PID \$XS_PID \$KGA_PID 2>/dev/null || true
EOF

sudo chmod +x /usr/local/bin/omniscience-session

# --- 6. Файл сессии ---
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
echo "Установлено:"
echo "  • kwin-x11 — композитор (X11, без Plasma)"
echo "  • kglobalacceld — глобальные горячие клавиши (Alt+Shift)"
echo "  • dbus — системная шина"
echo "  • xrandr — авто-частота монитора"
echo "  • wmctrl + xdotool — управление окнами"
echo "  • NetworkManager + nm-applet — Wi-Fi (в фоне)"
echo "  • bluez + blueman — Bluetooth (в фоне)"
echo "  • xsettingsd — настройки X11"
echo "  • setxkbmap — раскладка клавиатуры (US/RU)"
echo ""
echo "Автозагрузка системы ОТКЛЮЧЕНА — lxsession не используется."
echo "Никакие xfce/kde апплеты не запускаются автоматически."
echo ""
echo "Панель Omniscience резервирует 72px сверху через _NET_WM_STRUT_PARTIAL,"
echo "поэтому нативные окна не будут её перекрывать."
echo ""
echo "Выйди из сессии и выбери «Omniscience» на экране входа."
echo ""
echo "Если что-то не так:"
echo "  • /tmp/omniscience-error.log"
echo "  • ~/.config/kwinrc"