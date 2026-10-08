import electronPkg from 'electron';
const { BrowserWindow, screen, ipcMain } = electronPkg;

const TOPBAR_H = 72;

export default async function () {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;

  global.topbarWindow = new BrowserWindow({
    title: 'The_Omniscience_panel',
    x: 0, y: 0, width, height: TOPBAR_H,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    focusable: true,      // ← явно
    acceptFirstMouse: true,  // ← для macOS, но не помешает
    type: 'dock',
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  global.topbarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  
  global.topbarWindow.once('ready-to-show', () => {
    const w = global.topbarWindow;
    w.setAlwaysOnTop(true, 'screen-saver');
    w.setBounds({ x: 0, y: 0, width, height: TOPBAR_H });
    w.show();
    w.focus();
  });

  // ── Растянуть/сжать для Overview ──
  ipcMain.on('topbar:set-mode', (_e, { mode }) => {
    const w = global.topbarWindow;
    if (!w || w.isDestroyed()) return;
    const h = mode === 'overview' ? height : TOPBAR_H;
    w.setBounds({ x: 0, y: 0, width: width, height: h });
    w.focus();
  });
  
  await global.$.TopBar_on_loaded();
}