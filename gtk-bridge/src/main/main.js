const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const WS_URL = 'ws://127.0.0.1:8765';
const isDev = !app.isPackaged;
const forceDist = process.env.USE_DIST === '1';

// windowId (от демона) → BrowserWindow
const windows = new Map();
let ws = null;
let wsReconnectTimer = null;

// ---------- окно ----------------------------------------------------------

function windowUrl(windowId) {
  if (!forceDist && isDev) {
    return `http://localhost:5173/?windowId=${encodeURIComponent(windowId)}`;
  }
  const distIndex = path.join(__dirname, '../../dist/index.html');
  return { file: distIndex, query: { windowId } };
}

function createAppWindow(windowId, title, frame) {
  if (windows.has(windowId)) return windows.get(windowId);

  // Позиция и размер: пока — центр экрана и дефолт.
  // Как только придёт первый frame, подгоним setContentSize.
  const primary = screen.getPrimaryDisplay();
  const workArea = primary.workAreaSize;
  const defaultW = Math.min(1000, workArea.width - 80);
  const defaultH = Math.min(700, workArea.height - 80);

  const win = new BrowserWindow({
    width: defaultW,
    height: defaultH,
    title: title || 'GTK Window',
    backgroundColor: '#1e1e2e',
    frame: false,             // без системных декораций
    autoHideMenuBar: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  windows.set(windowId, win);
  console.log(`[main] created window ${windowId} "${title}"`);

  const url = windowUrl(windowId);
  if (typeof url === 'string') {
    win.loadURL(url);
    if (isDev) win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(url.file, { query: url.query });
  }

  win.on('closed', () => {
    console.log(`[main] window ${windowId} closed`);
    windows.delete(windowId);
  });

  return win;
}

// ---------- демон --------------------------------------------------------

function handleDaemonMessage(msg) {
  if (!msg || typeof msg !== 'object') return;

  switch (msg.type) {
    case 'window-added':
      createAppWindow(msg.windowId, msg.title);
      break;

    case 'frame': {
      const win = windows.get(msg.windowId);
      if (!win) {
        // Пришёл frame без предварительного window-added
        createAppWindow(msg.windowId, msg.title);
        // И сразу передадим кадр после загрузки
        const w = windows.get(msg.windowId);
        if (w) {
          w.webContents.once('did-finish-load', () => {
            w.webContents.send('gtk-frame', msg);
            applyFrameSize(w, msg);
          });
        }
        break;
      }
      win.webContents.send('gtk-frame', msg);
      // Подгоняем размер окна под GTK-окно (один раз)
      if (!win._sizedByFirstFrame) {
        win._sizedByFirstFrame = true;
        applyFrameSize(win, msg);
      }
      break;
    }

    case 'window-removed': {
      const win = windows.get(msg.windowId);
      if (win) win.close();
      break;
    }
  }
}

function applyFrameSize(win, frame) {
  try {
    if (!frame.width || !frame.height) return;
    // ограничим разумными пределами, чтобы окно не вылетело за экран
    const primary = screen.getPrimaryDisplay();
    const maxW = primary.workAreaSize.width - 40;
    const maxH = primary.workAreaSize.height - 40;
    const w = Math.min(Math.max(frame.width, 200), maxW);
    const h = Math.min(Math.max(frame.height, 150), maxH);
    win.setContentSize(w, h);
    win.center();
  } catch (e) {
    console.warn('[main] setContentSize failed:', e.message);
  }
}

function connectDaemon() {
  if (ws) return;
  console.log(`[main] connecting to daemon at ${WS_URL}`);

  ws = new WebSocket(WS_URL);

  ws.on('open', () => console.log('[main] daemon connected'));
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    handleDaemonMessage(msg);
  });
  ws.on('error', (e) => console.warn('[main] ws error:', e.message));
  ws.on('close', () => {
    console.log('[main] daemon disconnected, retry in 2s');
    ws = null;
    wsReconnectTimer = setTimeout(connectDaemon, 2000);
  });
}

// ---------- IPC от renderer'а --------------------------------------------

// Обратная связь (клик из Electron в GTK) — заготовка.
// Сейчас WS-демон не принимает сообщения от клиентов, поэтому просто логируем.
ipcMain.on('gtk-send', (_evt, payload) => {
  console.log('[main] gtk-send:', JSON.stringify(payload).slice(0, 200));
  // Когда демон научится принимать — здесь будет ws.send(...)
});

ipcMain.on('window-close-self', (evt) => {
  const w = BrowserWindow.fromWebContents(evt.sender);
  if (w) w.close();
});

// ---------- lifecycle -----------------------------------------------------

app.whenReady().then(() => {
  connectDaemon();

  app.on('activate', () => {
    // На macOS: если окон нет — создаём placeholder
    if (BrowserWindow.getAllWindows().length === 0 && process.platform === 'darwin') {
      // placeholder window — можно не делать, ждём сигнала от демона
    }
  });
});

app.on('window-all-closed', () => {
  // Не завершаем приложение — ждём новых окон от демона
  // Чтобы выйти — Ctrl+C в терминале или через трей
});

app.on('before-quit', () => {
  if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
  if (ws) try { ws.close(); } catch {}
});