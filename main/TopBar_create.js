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

  global.topbarWindow.loadURL(global.paths.topBarIndex);
  global.$.initPanelStruts();

  // ── Растянуть/сжать для Overview ──
  ipcMain.on('topbar:set-mode', (_e, { mode }) => {
    const w = global.topbarWindow;
    if (!w || w.isDestroyed()) return;
    const h = mode === 'overview' ? height : TOPBAR_H;
    w.setBounds({ x: 0, y: 0, width: width, height: h });
  });
}