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
install_packages() {
  case "$DISTRO" in
    ubuntu|debian|parrot|kali|linuxmint|pop)
      sudo apt update
      sudo apt install -y kwin-x11 dbus-x11 x11-xserver-utils
      ;;
    arch|manjaro|endeavouros|garuda)
      sudo pacman -S --noconfirm kwin dbus xorg-xrandr
      ;;
    fedora|rhel|centos)
      sudo dnf install -y kwin dbus-x11 xrandr
      ;;
    opensuse*|sles)
      sudo zypper install -y kwin dbus-1-x11 xrandr
      ;;
    void)
      sudo xbps-install -y kwin dbus xrandr
      ;;
    *)
      echo "❌ Неизвестный дистрибутив: $DISTRO"
      echo "   Установите kwin, dbus и xrandr вручную, затем:"
      echo "   ./install-omniscience-session.sh --skip-packages"
      return 1
      ;;
  esac
}

if [ "$2" != "--skip-packages" ]; then
  echo "📥 Устанавливаю kwin + dbus + xrandr..."
  install_packages || exit 1
else
  echo "⏭  Пропускаю установку пакетов"
fi

# --- 3. Конфиг KWin ---
# MaxFPS=0 → KWin не ограничивает FPS сам, синхронизируется с X.
# Реальную частоту выставит xrandr перед стартом KWin.
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

# --- 4. Скрипт запуска сессии ---
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

# --- dbus ---
if [ -z "\$DBUS_SESSION_BUS_ADDRESS" ]; then
  eval "\$(dbus-launch --sh-syntax)"
  export DBUS_SESSION_BUS_ADDRESS
  export DBUS_SESSION_BUS_PID
fi

# --- Определяем активный выход и его максимальную частоту ---
sleep 1

# Ищем primary-выход. Если его нет — берём первый connected.
PRIMARY_OUT=\$(xrandr --query | grep ' connected primary' | awk '{print \$1}')
if [ -z "\$PRIMARY_OUT" ]; then
  PRIMARY_OUT=\$(xrandr --query | grep ' connected' | head -1 | awk '{print \$1}')
fi

if [ -z "\$PRIMARY_OUT" ]; then
  echo "[session] не найден активный выход монитора" >&2
else
  # Берём строку с режимами для этого выхода (первая строка с цифрами).
  MODE_LINE=\$(xrandr --query | awk -v out="\$PRIMARY_OUT" '
    \$0 ~ "^"out" connected" { found=1; next }
    found && /^[[:space:]]*[0-9]/ { print; exit }
  ')

  if [ -z "\$MODE_LINE" ]; then
    echo "[session] \$PRIMARY_OUT: не удалось найти режимы" >&2
  else
    # Разрешение — первое поле.
    RES=\$(echo "\$MODE_LINE" | awk '{print \$1}')
    # Максимальная частота — максимум из всех чисел с точкой.
    MAX_RATE=\$(echo "\$MODE_LINE" | grep -oE '[0-9]+\.[0-9]+' | sort -rn | head -1)

    if [ -n "\$RES" ] && [ -n "\$MAX_RATE" ]; then
      echo "[session] \$PRIMARY_OUT: применяю \${RES} @ \${MAX_RATE} Hz"
      xrandr --output "\$PRIMARY_OUT" --mode "\$RES" --rate "\$MAX_RATE" 2>/dev/null \\
        || echo "[session] xrandr не смог применить режим" >&2

      # Запасной вариант для KWin: задать частоту в миллигерцах через env.
      MAX_RATE_INT=\${MAX_RATE%.*}
      if [ -n "\$MAX_RATE_INT" ]; then
        export KWIN_X11_REFRESH_RATE=\$((MAX_RATE_INT * 1000))
        echo "[session] KWIN_X11_REFRESH_RATE=\$KWIN_X11_REFRESH_RATE"
      fi
    fi
  fi
fi

# --- KWin ---
mkdir -p "\$HOME/.config"
cp -f /etc/omniscience/kwinrc "\$HOME/.config/kwinrc"
cp -f /etc/omniscience/kwinrulesrc "\$HOME/.config/kwinrulesrc"

kwin_x11 --no-kactivities --replace &
KWIN_PID=\$!
sleep 2

# --- Omniscience ---
npx electron . &
OMNI_PID=\$!

wait \$OMNI_PID
kill \$KWIN_PID 2>/dev/null || true
EOF

sudo chmod +x /usr/local/bin/omniscience-session

# --- 5. Файл сессии ---
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
echo "Что настроено:"
echo "  • KWin с MaxFPS=0 (без ограничений)"
echo "  • xrandr выставит максимальную частоту монитора ПЕРЕД KWin"
echo "  • KWIN_X11_REFRESH_RATE задаётся динамически (не хардкод!)"
echo ""
echo "Выйди из сессии и выбери «Omniscience» на экране входа."