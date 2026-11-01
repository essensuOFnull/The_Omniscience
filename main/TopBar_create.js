import electronPkg from 'electron';
const { BrowserWindow, screen, ipcMain } = electronPkg;
import {
  recoverWindowsShell, setWindowsDockSuppressed,
} from './ipc_nativeWindows.js';

const TOPBAR_H = 72;

export default async function () {
  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.bounds;

  global.topbarWindow = new BrowserWindow({
    title: 'The_Omniscience_panel',
    x, y, width, height: TOPBAR_H,
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

  const reportRendererFailure = (reason) => {
    recoverWindowsShell(reason).catch((error) => {
      console.error('[topbar] shell recovery failed:', error.message);
    });
  };
  global.topbarWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, description, _url, isMainFrame) => {
      if (isMainFrame && errorCode !== -3) {
        reportRendererFailure(`TopBar failed to load (${errorCode}): ${description}`);
      }
    },
  );
  global.topbarWindow.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit') {
      reportRendererFailure(`TopBar renderer exited: ${details.reason} (${details.exitCode})`);
    }
  });

  global.topbarWindow.loadURL(global.paths.topBarIndex).catch((error) => {
    reportRendererFailure(`TopBar load failed: ${error.message}`);
  });
  global.$.initPanelStruts();

  // ── Растянуть/сжать для Overview ──
  ipcMain.on('topbar:set-mode', (_e, { mode }) => {
    const w = global.topbarWindow;
    if (!w || w.isDestroyed()) return;
    const h = mode === 'overview' ? height : TOPBAR_H;
    if (process.platform === 'win32') {
      setWindowsDockSuppressed(w, mode === 'overview');
    }
    w.setBounds({ x, y, width, height: h });
  });
}