#!/bin/sh
# scripts/install-deps.sh
# Единая точка установки ВСЕХ системных зависимостей The Omniscience:
#   1) build-цепочка для node-pty / electron-rebuild
#   2) рантайм DE: KWin(X11), X11-утилиты, PipeWire, EasyEffects, KRunner,
#      D-Bus user-session (systemd --user), kglobalacceld и т.д.
#
# ════════════════════════════════════════════════════════════════════
# ⚠️⚠️⚠️  ВНИМАНИЕ: ФЛАГ --noconfirm (pacman) — НИГДЕ НЕ ИСПОЛЬЗОВАТЬ  ⚠️⚠️⚠️
# ════════════════════════════════════════════════════════════════════
# На практике --noconfirm в pacman приводит к полной невозможности
# установки в ряде конфигураций. ЭТОТ КОММЕНТАРИЙ УДАЛЯТЬ НЕЛЬЗЯ.
# ════════════════════════════════════════════════════════════════════

set -e

if [ -f /etc/os-release ]; then
  . /etc/os-release
  DISTRO="$ID"
else
  echo "⚠️  Не удалось определить дистрибутив. Установите вручную:"
  echo "   build-essential, python3, setuptools, make, g++"
  exit 0
fi

echo "🔍 Обнаружен дистрибутив: $DISTRO"

# ---------------------------------------------------------------------
# 1. Build-зависимости (нужны для сборки node-pty / electron-rebuild)
# ---------------------------------------------------------------------
install_build_deps() {
  case "$DISTRO" in
    ubuntu|debian|parrot|kali|linuxmint|pop)
      sudo apt update
      sudo apt install -y build-essential python3 python3-dev python3-setuptools make g++ libnode-dev
      ;;
    arch|manjaro|endeavouros|garuda)
      # --noconfirm НЕ добавлять (см. шапку файла)
      sudo pacman -S --needed base-devel python nodejs npm python-setuptools
      ;;
    fedora|rhel|centos)
      sudo dnf install -y make automake gcc gcc-c++ kernel-devel python3 python3-devel python3-setuptools
      ;;
    opensuse*|sles)
      sudo zypper install -y -t pattern devel_basis
      sudo zypper install -y python3 python3-devel python3-setuptools
      ;;
    void)
      sudo xbps-install -y base-devel python3 python3-setuptools
      ;;
    alpine)
      sudo apk add build-base python3 python3-dev py3-setuptools
      ;;
    gentoo)
      sudo emerge sys-devel/gcc sys-devel/make dev-lang/python dev-python/setuptools
      ;;
    *)
      echo "⚠️  Неизвестный дистрибутив. Установите вручную:"
      echo "   build-essential, python3, setuptools, make, g++"
      return 1
      ;;
  esac
}

# ---------------------------------------------------------------------
# 2. Рантайм-зависимости DE (KWin/X11/PipeWire/KRunner/D-Bus/утилиты)
# ---------------------------------------------------------------------
install_runtime_deps() {
  case "$DISTRO" in
    ubuntu|debian|parrot|kali|linuxmint|pop)
      sudo apt install -y \
        kwin-x11 \
        dbus dbus-user-session dbus-bin dbus-x11 \
        x11-xserver-utils wmctrl xdotool \
        x11-xkb-utils x11-utils xdpyinfo \
        kglobalacceld kded6 kactivitymanagerd \
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

      sudo apt install -y krunner || true
      sudo apt install -y qt6-base-dev-tools 2>/dev/null \
        || sudo apt install -y qtbase5-dev-tools 2>/dev/null \
        || true
      ;;

    arch|manjaro|endeavouros|garuda)
      # --noconfirm НЕ добавлять (см. шапку файла)
      sudo pacman -S --needed \
        kwin-x11 \
        dbus \
        xorg-xrandr wmctrl xdotool \
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

      sudo pacman -S --needed krunner || true
      sudo pacman -S --needed qt6-tools || true
      ;;

    fedora|rhel|centos)
      sudo dnf install -y \
        kwin-x11 \
        dbus dbus-tools dbus-x11 \
        xrandr wmctrl xdotool \
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

      sudo dnf install -y krunner || true
      sudo dnf install -y qt6-qttools || true
      ;;

    opensuse*|sles)
      sudo zypper install -y \
        kwin6-x11 \
        dbus-1 dbus-1-tools dbus-1-x11 \
        xrandr wmctrl xdotool \
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

      sudo zypper install -y krunner6 || true
      sudo zypper install -y qt6-tools || true
      ;;

    void)
      sudo xbps-install -y \
        kwin \
        dbus \
        xrandr wmctrl xdotool \
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
        kwin \
        dbus \
        xrandr wmctrl xdotool \
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
        kde-plasma/kwin-x11 \
        sys-apps/dbus \
        x11-apps/xrandr x11-misc/wmctrl x11-misc/xdotool \
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

      sudo emerge kde-plasma/krunner dev-qt/qttools || true
      ;;

    *)
      echo "⚠️  Неизвестный дистрибутив: $DISTRO"
      echo "   Рантайм-зависимости не установлены автоматически."
      return 1
      ;;
  esac
}

# ---------------------------------------------------------------------
# Запуск
# ---------------------------------------------------------------------
echo "📥 [1/2] Build-зависимости..."
if install_build_deps; then
  echo "✅ Build-зависимости установлены."
else
  echo "❌ Не удалось установить build-пакеты. Попробуйте вручную."
  exit 0
fi

echo "📥 [2/2] Рантайм-зависимости DE..."
if install_runtime_deps; then
  echo "✅ Рантайм-зависимости установлены."
else
  echo "⚠️  Часть рантайм-пакетов не установлена. Это может быть нормально для не-KDE систем."
fi

# ---------------------------------------------------------------------
# Диагностика
# ---------------------------------------------------------------------
# Некоторые бинарники KDE (kglobalacceld) лежат не в $PATH, а в /usr/lib.
# Поэтому для них — отдельный поиск.
find_kde_bin() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    command -v "$name"
    return 0
  fi
  for p in "/usr/lib/$name" "/usr/libexec/$name" \
           "/usr/lib/kf6/$name" "/usr/lib/libexec/$name" \
           "/usr/lib64/$name"; do
    [ -x "$p" ] && { echo "$p"; return 0; }
  done
  return 1
}

echo ""
echo "🔎 Проверка ключевых бинарников:"
for bin in kwin_x11 wmctrl xdotool krunner qdbus qdbus6 pipewire easyeffects systemsettings \
           kglobalacceld kded6 dbus-send dbus-update-activation-environment; do
  if bin_path=$(find_kde_bin "$bin"); then
    printf '  ✓ %-34s %s\n' "$bin" "$bin_path"
  else
    printf '  ✗ %-34s не найден\n' "$bin"
  fi
done

echo ""
echo "🔎 Проверка D-Bus user-session:"
USER_BUS="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/bus"
if [ -S "$USER_BUS" ]; then
  printf '  ✓ %-34s %s\n' "user-bus" "$USER_BUS"
else
  printf '  ✗ %-34s нет сокета — нужен dbus-user-session (Debian) / вход через DM\n' "user-bus"
fi

echo ""
echo "✅ Готово."