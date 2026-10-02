#!/bin/sh
# scripts/install-deps.sh
# Автоматическая установка системных зависимостей для сборки node-pty и electron-rebuild

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

install_deps() {
  case "$DISTRO" in
    ubuntu|debian|parrot|kali|linuxmint|pop)
      sudo apt update
      sudo apt install -y build-essential python3 python3-dev python3-setuptools make g++ libnode-dev
      ;;
    arch|manjaro|endeavouros|garuda)
      sudo pacman -S --noconfirm --needed base-devel python nodejs npm python-setuptools
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

if install_deps; then
  echo "✅ Системные зависимости установлены."
else
  echo "❌ Не удалось установить пакеты. Попробуйте вручную."
  exit 0
fi