import electronPkg from 'electron';
const { BrowserWindow, ipcMain, screen } = electronPkg;
import { attachToWebContents } from './ipc_browserContextMenu.js';
import { registerShellWindow, unregisterShellWindow } from './ipc_windowManager.js';

let overviewWindow = null;

export function isOverviewOpen() {
  return !!(overviewWindow && !overviewWindow.isDestroyed());
}

/* ------------------------------------------------------------------ */
/* Вычисление точных границ Overview                                   */
/* ------------------------------------------------------------------ */

const EDGE_EPS = 4;   // допуск на нечётные пиксели

function isHorizontal(rect) {
  return rect.width > rect.height;
}

/**
 * Считаем область Overview напрямую:
 *   display.bounds − topbarWindow.getBounds()
 * Все координаты в DIP, одинаковой системе что и getBounds().
 *
 * Логика:
 *   1) Если topbar-окна нет — отдаём display.bounds.
 *   2) Определяем, к какой стороне экрана прижат topbar.
 *   3) Отрезаем от bounds соответствующую полосу.
 *   4) Если topbar не прижат ни к одной стороне — отдаём display.bounds
 *      (поведение по умолчанию: полностью перекрыть экран).
 */
function computeOverviewBounds() {
  const display = screen.getPrimaryDisplay();
  const scr = display.workArea;//на случай чужеродного DE

  const tb = global.topbarWindow;
  const tbB = tb.getBounds();

  const tbBottom = tbB.y + tbB.height;
  const tbLeft   = tbB.x;

  return { x: tbLeft, y: tbBottom, width: scr.width-tbLeft, height: scr.height-tbBottom };
}

/* ------------------------------------------------------------------ */
/* Открытие / закрытие                                                 */
/* ------------------------------------------------------------------ */

export function openOverview() {
  if (isOverviewOpen()) {
    try { overviewWindow.focus(); } catch { /* ignore */ }
    return overviewWindow;
  }

  const bounds = computeOverviewBounds();

  const win = new BrowserWindow({
    x: bounds.x, y: bounds.y,
    width: bounds.width, height: bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    hasShadow: false,
    type: 'toolbar',
    webPreferences: {
      session: global.mainWindow?.webContents?.session || undefined,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      webviewTag: false,
      transparent: true,
      backgroundColor: '#00000000',
    },
  });

  try { win.setAlwaysOnTop(true, 'screen-saver'); } catch { /* ignore */ }
  try { win.setFullScreenable(false); } catch { /* ignore */ }

  try { attachToWebContents(win.webContents); } catch { /* ignore */ }

  win.loadURL(global.paths.overviewIndex);

  try { registerShellWindow(win, '__overview__', { title: 'Overview' }); }
  catch (e) { console.error('[overview] registerShellWindow:', e?.message || e); }

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return;
    // Пересчитываем ещё раз — вдруг TopBar уже подвинулся
    const b2 = computeOverviewBounds();
    try { win.setBounds(b2); } catch { /* ignore */ }
    win.show();
    try { win.focus(); } catch { /* ignore */ }
    try { win.webContents.send('overview:opened'); } catch { /* ignore */ }
    global.topbarBroadcast?.();
  });

  win.on('closed', () => {
    try { unregisterShellWindow('__overview__'); } catch { /* ignore */ }
    overviewWindow = null;
    global.topbarBroadcast?.();
  });

  // Если WM всё же попытается сдвинуть/изменить окно — возвращаем на место.
  win.on('resize', () => {
    if (win.isDestroyed()) return;
    try {
      const want = computeOverviewBounds();
      const cur = win.getBounds();
      if (cur.x !== want.x || cur.y !== want.y ||
          cur.width !== want.width || cur.height !== want.height) {
        win.setBounds(want);
      }
    } catch { /* ignore */ }
  });

  overviewWindow = win;
  return win;
}

export function closeOverview() {
  if (!isOverviewOpen()) return;
  try { overviewWindow.close(); } catch { /* ignore */ }
  overviewWindow = null;
}

export function toggleOverview() {
  if (isOverviewOpen()) closeOverview();
  else openOverview();
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

export default function () {
  ipcMain.handle('overview:open',    () => { openOverview();   return { ok: true }; });
  ipcMain.handle('overview:close',   () => { closeOverview();  return { ok: true }; });
  ipcMain.handle('overview:toggle',  () => { toggleOverview(); return { ok: true }; });
  ipcMain.handle('overview:is-open', () => isOverviewOpen());

  ipcMain.on('overview:open',   () => { try { openOverview();   } catch (e) { console.error('[overview:open]', e?.message); } });
  ipcMain.on('overview:close',  () => { try { closeOverview();  } catch (e) { console.error('[overview:close]', e?.message); } });
  ipcMain.on('overview:toggle', () => { try { toggleOverview(); } catch (e) { console.error('[overview:toggle]', e?.message); } });
}