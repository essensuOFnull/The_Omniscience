import electronPkg from 'electron';
const { BrowserWindow, screen, ipcMain } = electronPkg;

const TOPBAR_H = 72;

export default async function () {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  global.topbarWindow = new BrowserWindow({
    x: 0, y: 0, width, height: TOPBAR_H,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    ...(process.platform === 'linux' ? { type: 'dock' } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  global.topbarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });

  global.topbarWindow.once('ready-to-show', () => {
    global.topbarWindow.showInactive();
  });

  // ── Растянуть/сжать для Overview ──
  ipcMain.on('topbar:set-mode', (_e, { mode }) => {
    const w = global.topbarWindow;
    if (!w || w.isDestroyed()) return;
    const wa = screen.getPrimaryDisplay().workAreaSize;
    const h = mode === 'overview' ? wa.height : TOPBAR_H;
    w.setBounds({ x: 0, y: 0, width: wa.width, height: h });
  });

  ipcMain.on('topbar:set-visible', (_e, { visible }) => {
    const w = global.topbarWindow;
    if (!w || w.isDestroyed()) return;
    if (visible) w.showInactive();
    else w.hide();
  });

  await global.$.TopBar_on_loaded();
}