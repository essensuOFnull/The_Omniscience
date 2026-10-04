#!/bin/bash

# ============================================================
# Omniscience — регистрация общепринятых сочетаний клавиш
# через штатный KGlobalAccel (KDE)
# ============================================================

set -u

# --- Определяем инструмент (KDE 5 или 6) ---
if command -v kwriteconfig6 > /dev/null 2>&1; then
  KW="kwriteconfig6"
  KQUIT="kquitapp6"
  KSTART="kstart"
elif command -v kwriteconfig5 > /dev/null 2>&1; then
  KW="kwriteconfig5"
  KQUIT="kquitapp5"
  KSTART="kstart5"
else
  echo "[shortcuts] ❌ не найден kwriteconfig5/6. KDE установлен?"
  exit 1
fi

echo "[shortcuts] использую $KW"

# --- Папки ---
APPS_DIR="$HOME/.local/share/applications"
mkdir -p "$APPS_DIR"

# --- Определяем доступные приложения ---
# Если чего-то нет — используем fallback.
pick() {
  for cmd in "$@"; do
    if command -v "$cmd" > /dev/null 2>&1; then
      echo "$cmd"
      return 0
    fi
  done
  echo "$1"
}

TERMINAL=$(pick xterm xfce4-terminal konsole gnome-terminal)
FILEMAN=$(pick dolphin thunar nautilus pcmanfm nemo)
BROWSER=$(pick firefox google-chrome chromium brave-browser)

echo "[shortcuts] терминал: $TERMINAL"
echo "[shortcuts] файлы:    $FILEMAN"
echo "[shortcuts] браузер:  $BROWSER"

# --- 1. Создаём .desktop файлы для приложений ---
mk_desktop() {
  local id="$1"
  local name="$2"
  local exec_cmd="$3"
  local icon="$4"
  cat > "$APPS_DIR/$id.desktop" << EOF
[Desktop Entry]
Type=Application
Name=$name
Exec=$exec_cmd
Icon=$icon
NoDisplay=true
X-KDE-GlobalAccel-CommandShortcut=true
EOF
  echo "[shortcuts] .desktop: $id.desktop"
}

mk_desktop "omni-terminal" "Omniscience Terminal" "$TERMINAL" "utilities-terminal"
mk_desktop "omni-filemanager" "Omniscience Files"    "$FILEMAN"  "system-file-manager"
mk_desktop "omni-browser"     "Omniscience Browser"  "$BROWSER"  "web-browser"

# --- 2. Настраиваем сочетания ---
set_shortcut() {
  local group="$1"
  local key="$2"
  local value="$3"
  $KW --file kglobalshortcutsrc \
      --group "services" \
      --group "$group" \
      --key "$key" \
      "$value" 2>/dev/null || true
  echo "[shortcuts] $group.$key = $value"
}

# Терминал: Meta+Enter
set_shortcut "omni-terminal.desktop" "_launch" "Meta+Return,none,Omniscience Terminal"

# Файловый менеджер: Meta+E
set_shortcut "omni-filemanager.desktop" "_launch" "Meta+E,none,Omniscience Files"

# Браузер: Meta+B
set_shortcut "omni-browser.desktop" "_launch" "Meta+B,none,Omniscience Browser"

# --- 3. Системные сочетания KWin ---
# Показать рабочий стол: Meta+D
$KW --file kglobalshortcutsrc \
    --group "kwin" \
    --key "ShowDesktop" \
    "Meta+D,none,Show Desktop" 2>/dev/null || true

# Закрыть окно: Alt+F4 (на случай, если сбилось)
$KW --file kglobalshortcutsrc \
    --group "kwin" \
    --key "Window Close" \
    "Alt+F4,none,Close Window" 2>/dev/null || true

# --- 4. Meta как модификатор (открывает KRunner / меню) ---
$KW --file kwinrc \
    --group "ModifierOnlyShortcuts" \
    --key "Meta" \
    "org.kde.krunner,/App,,toggleDisplay" 2>/dev/null || true
echo "[shortcuts] Meta -> KRunner"

# --- 5. Перезагружаем конфигурацию ---
echo "[shortcuts] перезагружаю kglobalaccel..."
if command -v qdbus > /dev/null 2>&1; then
  qdbus org.kde.kglobalaccel /kglobalaccel \
        org.kde.KGlobalAccel.reloadConfiguration 2>/dev/null || true
  qdbus org.kde.KWin /KWin reconfigure 2>/dev/null || true
fi

# Fallback: перезапуск демона
$KQUIT kglobalaccel > /dev/null 2>&1 || true
sleep 1
nohup /usr/lib/kglobalacceld > /dev/null 2>&1 &
disown 2>/dev/null || true

echo ""
echo "✅ Сочетания установлены:"
echo "   Meta+Enter  → терминал ($TERMINAL)"
echo "   Meta+E      → файлы ($FILEMAN)"
echo "   Meta+B      → браузер ($BROWSER)"
echo "   Meta+D      → показать рабочий стол"
echo "   Alt+F4      → закрыть окно"
echo "   Meta        → KRunner"
echo ""