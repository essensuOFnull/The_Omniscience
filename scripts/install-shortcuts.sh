#!/bin/bash
# scripts/install-shortcuts.sh
# КОНФИГУРАЦИЯ глобальных сочетаний клавиш KDE (Plasma 6).
#
# ВАЖНО: этот скрипт НЕ ставит пакеты. Установка — только в install-deps.sh.
# Здесь мы предполагаем, что kglobalacceld уже стоит в системе, и только:
#   1) регистрируем DBus service file (чтобы шина могла поднять демон по требованию)
#   2) пишем systemd --user unit, если пакет не принёс свой
#   3) пишем portal-compat .desktop (обход бага Qt "App info not found")
#   4) сбрасываем возможный failed от прошлых запусков
#
# Сочетания клавиш задают сами приложения KDE (KWin, Spectacle и т.д.)
# через org.kde.kglobalaccel. Менять: systemsettings → Сочетания клавиш.
#
# ════════════════════════════════════════════════════════════════════
# ⚠️⚠️⚠️  ВНИМАНИЕ: ФЛАГ --noconfirm (pacman) — НИГДЕ НЕ ИСПОЛЬЗОВАТЬ  ⚠️⚠️⚠️
# ════════════════════════════════════════════════════════════════════
# На практике --noconfirm в pacman приводит к полной невозможности
# установки в ряде конфигураций. Этот комментарий удалять нельзя.
# Если понадобится доставить пакет — иди в install-deps.sh, не сюда.
# ════════════════════════════════════════════════════════════════════

set -e

# --- 0. Поиск бинаря kglobalacceld ---
# На Arch/Manjaro бинарь лежит в /usr/lib/kglobalacceld, а не в $PATH.
# На Debian/Ubuntu — обычно в $PATH. Проверяем оба варианта.
find_kglobalacceld() {
  if command -v kglobalacceld >/dev/null 2>&1; then
    command -v kglobalacceld
    return 0
  fi
  for p in /usr/lib/kglobalacceld /usr/libexec/kglobalacceld \
           /usr/lib/kf6/kglobalacceld /usr/lib/libexec/kglobalacceld \
           /usr/lib64/kglobalacceld ; do
    [ -x "$p" ] && { echo "$p"; return 0; }
  done
  return 1
}

KGA_BIN="$(find_kglobalacceld || true)"
if [ -z "$KGA_BIN" ]; then
  echo "❌ kglobalacceld не найден ни в \$PATH, ни в стандартных каталогах."
  echo "   Сначала запусти scripts/install-deps.sh — он ставит все системные пакеты."
  exit 1
fi
echo "🔎 kglobalacceld: $KGA_BIN"

# --- 1. DBus service file: без него шина не активирует демон по требованию ---
DBUS_SERVICE=/usr/share/dbus-1/services/org.kde.kglobalaccel.service
if [ ! -f "$DBUS_SERVICE" ]; then
  echo "📝 Пишу $DBUS_SERVICE..."
  sudo mkdir -p /usr/share/dbus-1/services
  sudo tee "$DBUS_SERVICE" > /dev/null << EOF
[D-BUS Service]
Name=org.kde.kglobalaccel
Exec=$KGA_BIN
EOF
  sudo chmod 644 "$DBUS_SERVICE"
fi

# --- 2. systemd --user unit: только если штатного нет ---
UNIT_EXISTS=0
for u in /usr/lib/systemd/user/plasma-kglobalaccel.service \
         /etc/systemd/user/plasma-kglobalaccel.service \
         "$HOME/.config/systemd/user/plasma-kglobalaccel.service"; do
  [ -f "$u" ] && { UNIT_EXISTS=1; break; }
done

if [ "$UNIT_EXISTS" = "0" ]; then
  echo "📝 Пишу ~/.config/systemd/user/plasma-kglobalaccel.service..."
  mkdir -p "$HOME/.config/systemd/user"
  cat > "$HOME/.config/systemd/user/plasma-kglobalaccel.service" << EOF
[Unit]
Description=KDE Global Shortcuts Server
After=graphical-session.target
PartOf=graphical-session.target

[Service]
Type=dbus
BusName=org.kde.kglobalaccel
ExecStart=$KGA_BIN
Restart=on-failure
Slice=session.slice

[Install]
WantedBy=graphical-session.target
EOF
  systemctl --user daemon-reload 2>/dev/null || true
else
  echo "✅ systemd unit уже есть — использую штатный"
fi

# --- 3. Обход бага KDE: Qt требует .desktop для org.kde.kglobalaccel ---
# Без него в journal: "Failed to register with host portal ... App info not found".
# Не фатально, но засоряет лог и ломает интеграцию с xdg-desktop-portal.
DESKTOP_FILE="$HOME/.local/share/applications/org.kde.kglobalaccel.desktop"
if [ ! -f "$DESKTOP_FILE" ]; then
  echo "📝 Пишу $DESKTOP_FILE (portal compat)..."
  mkdir -p "$(dirname "$DESKTOP_FILE")"
  cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=KDE Global Shortcuts (compat)
Exec=$KGA_BIN
Type=Application
NoDisplay=true
EOF
  update-desktop-database "$(dirname "$DESKTOP_FILE")" 2>/dev/null || true
fi

# --- 4. Сброс возможного failed от прошлых запусков ---
systemctl --user reset-failed plasma-kglobalaccel.service 2>/dev/null || true

echo "✅ Сочетания клавиш сконфигурированы (org.kde.kglobalaccel)."