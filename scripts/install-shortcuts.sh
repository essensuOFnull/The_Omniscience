#!/bin/bash
# scripts/install-shortcuts.sh
# Глобальные сочетания клавиш обслуживает kglobalacceld.
# Никаких собственных биндов не регистрируем — используются дефолты KDE,
# которые сами приложения (KWin, Spectacle и т.д.) прописывают через
# kglobalacceld при старте.
#
# Изменить: systemsettings → Сочетания клавиш.

set -e

if ! command -v kglobalacceld >/dev/null 2>&1; then
  echo "📥 Устанавливаю kglobalacceld..."
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    case "$ID" in
      ubuntu|debian|parrot|kali|linuxmint|pop) sudo apt update && sudo apt install -y kglobalacceld ;;
      arch|manjaro|endeavouros|garuda)         sudo pacman -S --needed --noconfirm kglobalacceld ;;
      fedora|rhel|centos)                      sudo dnf install -y kglobalacceld ;;
      opensuse*|sles)                          sudo zypper install -y kglobalacceld6 ;;
      void)                                    sudo xbps-install -y kglobalacceld ;;
      alpine)                                  sudo apk add kglobalacceld ;;
      gentoo)                                  sudo emerge kde-plasma/kglobalacceld ;;
      *) echo "⚠️  Неизвестный дистрибутив ($ID). Установите kglobalacceld вручную."; exit 1 ;;
    esac
  else
    echo "❌ Не удалось определить дистрибутив"; exit 1
  fi
fi

echo "✅ kglobalacceld готов — используются стандартные сочетания KDE."