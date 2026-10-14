import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, ipcMain, BrowserWindow } from 'electron';
import { WebSocket } from 'ws';
import { execFile } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.dirname(__dirname);

const DAEMON_BIN = path.join(__dirname, 'daemon', 'gtk-bridge-daemon');
const HOOK_SO = path.join(__dirname, 'native-hook', 'libgtk-hook.so');
const SOCKET_PATH = '/tmp/gtk-bridge.sock';
const WS_URL = 'ws://127.0.0.1:8765';
const PREFIX = 'gtk-bridge:';

let daemonProc = null;
let ws = null;
let wsRetry = null;
let enabled = true;

// daemonWindowId → electronWindowId (для логов)
const windowIdMap = new Map();
// daemonWindowId → BrowserWindow оверлея
const overlays = new Map();
// daemonWindowId → последний известный frame
const lastFrameByWindowId = new Map();

// ---------- daemon ---------------------------------------------------------

function startDaemon() {
  if (daemonProc) return;
  daemonProc = spawn(DAEMON_BIN, [], {
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: false,
    env: { ...process.env },
  });
  daemonProc.on('exit', (code, sig) => {
    console.log(`[gtk-bridge] daemon exited code=${code} sig=${sig}`);
    daemonProc = null;
    if (enabled) setTimeout(startDaemon, 2000);
  });
  console.log('[gtk-bridge] daemon started');
}

function stopDaemon() {
  if (!daemonProc) return;
  try { daemonProc.kill('SIGTERM'); } catch { }
  setTimeout(() => {
    if (daemonProc) try { daemonProc.kill('SIGKILL'); } catch { }
  }, 1500);
}

// ---------- WS -------------------------------------------------------------

function connectWS() {
  if (ws) return;
  ws = new WebSocket(WS_URL);

  ws.on('open', () => console.log('[gtk-bridge] WS connected'));
  ws.on('error', (e) => console.warn('[gtk-bridge] WS error:', e.message));
  ws.on('close', () => {
    ws = null;
    if (enabled) wsRetry = setTimeout(connectWS, 2000);
  });
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    handleDaemon(msg);
  });
}

function disconnectWS() {
  if (wsRetry) { clearTimeout(wsRetry); wsRetry = null; }
  if (ws) { try { ws.close(); } catch { } ws = null; }
}

// ---------- overlay window -------------------------------------------------

function overlayUrl(daemonWindowId, electronId) {
  const base = path.join(
    global.paths.distDir,
    'componentapps', 'gtk-bridge', 'index.html',
  );
  const q = new URLSearchParams({
    windowId: electronId,
    gtkWindowId: daemonWindowId,
  });
  return `file://${base}?${q.toString()}`;
}

// Поднимаем GTK-окно в текущий стек над оверлеем.
// Без постоянного флага "always on top" — иначе GTK будет висеть над всем DE.
function raiseGtkWindow(xid) {
  if (!xid) return;
  // windowraise — одноразовый подъём в стеке, не делает окно "всегда сверху".
  execFile('xdotool', ['windowraise', xid], (err) => {
    if (err) console.warn('[gtk-bridge] xdotool windowraise failed:', err.message);
  });
}

function createOverlay(daemonWindowId, title) {
  if (overlays.has(daemonWindowId)) return overlays.get(daemonWindowId);

  const electronId = PREFIX + daemonWindowId;
  windowIdMap.set(daemonWindowId, electronId);

  const ov = new BrowserWindow({
    width: 900,
    height: 600,
    x: 100,
    y: 100,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    show: false,
    // focusable НЕ трогаем — оставляем дефолтным (true).
    // type НЕ указываем — по умолчанию normal, и KWin не будет поднимать его.
    webPreferences: {
      preload: global.paths.reactPreload,
      contextIsolation: true,
      nodeIntegration: false,
      transparent: true,
      backgroundColor: '#00000000',
      backgroundThrottling: false,
    },
  });

  // Клики не ловим. НЕ трогаем alwaysOnTop.
  ov.setIgnoreMouseEvents(true);

  ov.loadURL(overlayUrl(daemonWindowId, electronId));

  ov.webContents.once('did-finish-load', () => {
    const last = lastFrameByWindowId.get(daemonWindowId);
    if (last) {
      ov.webContents.send('gtk-bridge:frame', last);
    }
  });

  ov.on('closed', () => {
    console.log(`[gtk-bridge] overlay closed: ${daemonWindowId}`);
    overlays.delete(daemonWindowId);
    windowIdMap.delete(daemonWindowId);
    lastFrameByWindowId.delete(daemonWindowId);
  });

  overlays.set(daemonWindowId, ov);
  console.log(`[gtk-bridge] overlay created for ${daemonWindowId} ("${title}")`);
  return ov;
}

// ---------- daemon events --------------------------------------------------

function handleDaemon(msg) {
  switch (msg.type) {
    case 'window-added': {
      createOverlay(msg.windowId, msg.title);
      break;
    }

    case 'geometry': {
      const ov = overlays.get(msg.windowId);
      if (!ov || ov.isDestroyed()) return;
      try {
        ov.setBounds({
          x: msg.x | 0,
          y: msg.y | 0,
          width: Math.max(100, msg.width | 0),
          height: Math.max(80, msg.height | 0),
        });
        if (!ov.isVisible()) {
          ov.showInactive();       // показываем без фокуса
          console.log(`[gtk-bridge] overlay shown at ${msg.x},${msg.y} ${msg.width}x${msg.height}`);
        }
        // Каждый раз, когда GTK-окно двигается, возвращаем его наверх оверлея
        if (msg.xid) raiseGtkWindow(msg.xid);
      } catch (e) {
        console.warn('[gtk-bridge] setBounds failed:', e.message);
      }
      break;
    }

    case 'frame': {
      lastFrameByWindowId.set(msg.windowId, msg);
      const ov = overlays.get(msg.windowId);
      if (ov && !ov.isDestroyed()) {
        ov.webContents.send('gtk-bridge:frame', msg);
      }
      break;
    }

    case 'window-removed': {
      lastFrameByWindowId.delete(msg.windowId);
      const ov = overlays.get(msg.windowId);
      if (ov && !ov.isDestroyed()) {
        try { ov.close(); } catch { }
      }
      overlays.delete(msg.windowId);
      windowIdMap.delete(msg.windowId);
      break;
    }
  }
}

// ---------- IPC ------------------------------------------------------------

function registerIpc() {
  ipcMain.handle('gtk-bridge:get-enabled', () => enabled);

  ipcMain.on('gtk-bridge:toggle', (_e, val) => {
    const want = !!val;
    if (want === enabled) return;
    enabled = want;
    if (want) {
      startDaemon();
      setTimeout(connectWS, 300);
    } else {
      disconnectWS();
      stopDaemon();
      for (const [, ov] of overlays) {
        try { ov.close(); } catch { }
      }
      overlays.clear();
      windowIdMap.clear();
      lastFrameByWindowId.clear();
    }
  });

  ipcMain.on('gtk-bridge:send', (_e, payload) => {
    if (ws && ws.readyState === 1) {
      try { ws.send(JSON.stringify(payload)); } catch { }
    }
  });

  ipcMain.on('gtk-bridge:close-self', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win && !win.isDestroyed()) win.close();
  });

  ipcMain.handle('gtk-bridge:hook-path', () => HOOK_SO);
  ipcMain.handle('gtk-bridge:socket-path', () => SOCKET_PATH);
}

// ---------- init -----------------------------------------------------------

export default async function initGtkBridge() {
  registerIpc();

  console.log('[gtk-bridge] autostart');
  startDaemon();
  setTimeout(connectWS, 300);

  app.on('before-quit', () => {
    disconnectWS();
    stopDaemon();
    for (const [, ov] of overlays) {
      try { ov.destroy(); } catch { }
    }
    overlays.clear();
  });
}

export { HOOK_SO, SOCKET_PATH };