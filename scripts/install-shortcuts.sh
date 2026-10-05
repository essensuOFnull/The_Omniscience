#!/bin/bash
# scripts/install-shortcuts.sh
# Устанавливает общепринятые сочетания клавиш через sxhkd.

set -e

if ! command -v sxhkd > /dev/null 2>&1; then
  echo "📥 Устанавливаю sxhkd..."
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    case "$ID" in
      ubuntu|debian|parrot|kali|linuxmint|pop) sudo apt install -y sxhkd ;;
      arch|manjaro|endeavouros|garuda) sudo pacman -S --noconfirm sxhkd ;;
      fedora|rhel|centos) sudo dnf install -y sxhkd ;;
      opensuse*|sles) sudo zypper install -y sxhkd ;;
      void) sudo xbps-install -y sxhkd ;;
      alpine) sudo apk add sxhkd ;;
      gentoo) sudo emerge x11-misc/sxhkd ;;
      *) echo "⚠️  Установите sxhkd вручную"; exit 0 ;;
    esac
  fi
fi

# Проверяем, что есть папка для скриншотов
mkdir -p "$HOME/Pictures/Screenshots"

CONFIG_DIR="$HOME/.config/sxhkd"
mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_DIR/sxhkdrc" << 'EOF'
# ============================================================
# Omniscience — горячие клавиши
# ============================================================

# Терминал
super + Return
    xterm

# Файловый менеджер (Chonky как приложение)
super + e
    chonky

# Показать рабочий стол
super + d
    sh -c 'xprop -root _NET_SHOWING_DESKTOP | grep -q "= 1" && wmctrl -k off || wmctrl -k on'

# --- Скриншоты (Spectacle) ---
# Весь экран
Print
    spectacle -f -b -n -o ~/Pictures/Screenshots/$(date +%Y-%m-%d_%H-%M-%S).png

# Область
shift + Print
    spectacle -r -b -n -o ~/Pictures/Screenshots/$(date +%Y-%m-%d_%H-%M-%S).png

# Активное окно
super + Print
    spectacle -a -b -n -o ~/Pictures/Screenshots/$(date +%Y-%m-%d_%H-%M-%S).png

# --- Управление громкостью ---
XF86AudioRaiseVolume
    wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+

XF86AudioLowerVolume
    wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-

XF86AudioMute
    wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle

# --- Переключение раскладки (если setxkbmap не справляется) ---
alt + shift
    sh -c 'current=$(xkb-switch -p 2>/dev/null || echo "us"); if [ "$current" = "us" ]; then xkb-switch -s ru; else xkb-switch -s us; fi'
EOF

echo "✅ Горячие клавиши установлены в $CONFIG_DIR/sxhkdrc"