import electronPkg from 'electron';
const { ipcMain } = electronPkg;
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { access, readFile } from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const POLL_INTERVAL_MS = 1000;

const IGNORE_CLASS_PARTS = ['the_omniscience', 'electron', 'kwin', 'plasmashell'];

let pollTimer = null;
let lastHash = '';
let isBusy = false;
let userInteracting = false;

/* ------------------------------------------------------------------ */
/* Иконки                                                              */
/* ------------------------------------------------------------------ */

const ICON_CACHE = new Map();       // appName → data-URI или null
const WMCLASS_TO_APP = new Map();   // wmClass → имя приложения

const ICON_DIRS = [
  '/usr/share/icons/hicolor',
  '/usr/share/icons/Adwaita',
  '/usr/share/icons/gnome',
  '/usr/share/icons/Papirus',
  '/usr/share/icons/Papirus-Dark',
  '/usr/share/icons/breeze',
  '/usr/share/icons/breeze-dark',
  '/usr/share/icons/Arc',
  '/usr/share/icons/Numix',
  path.join(os.homedir(), '.local/share/icons/hicolor'),
];

const ICON_SIZES = ['48x48', '64x64', '128x128', 'scalable', '32x32', '256x256', '512x512'];
const ICON_EXTS = ['png', 'svg', 'xpm'];

async function fileToDataUri(filePath, ext) {
  try {
    const buf = await readFile(filePath);
    const mime = ext === 'svg' ? 'image/svg+xml'
      : ext === 'png' ? 'image/png'
        : 'image/x-xpixmap';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (_) {
    return null;
  }
}

async function findIconPath(appName) {
  if (!appName) return null;
  if (ICON_CACHE.has(appName)) return ICON_CACHE.get(appName);

  for (const baseDir of ICON_DIRS) {
    for (const size of ICON_SIZES) {
      for (const ext of ICON_EXTS) {
        const p = path.join(baseDir, size, 'apps', `${appName}.${ext}`);
        try {
          await access(p);
          const dataUri = await fileToDataUri(p, ext);
          ICON_CACHE.set(appName, dataUri);
          return dataUri;
        } catch (_) { }
      }
    }
  }
  ICON_CACHE.set(appName, null);
  return null;
}

async function resolveIconForWmClass(wmClass) {
  if (!wmClass) return null;
  if (WMCLASS_TO_APP.has(wmClass)) {
    const appName = WMCLASS_TO_APP.get(wmClass);
    return appName ? await findIconPath(appName) : null;
  }

  const lower = wmClass.toLowerCase();
  const candidates = new Set();
  candidates.add(lower);
  const parts = lower.split('.').filter(Boolean);
  if (parts.length) {
    candidates.add(parts[parts.length - 1]);
    candidates.add(parts[0]);
  }
  candidates.add(lower.replace(/^org\./, '').replace(/^com\./, ''));

  for (const name of candidates) {
    const icon = await findIconPath(name);
    if (icon) {
      WMCLASS_TO_APP.set(wmClass, name);
      return icon;
    }
  }
  WMCLASS_TO_APP.set(wmClass, '');
  return null;
}

/* ------------------------------------------------------------------ */
/* Список окон                                                         */
/* ------------------------------------------------------------------ */

async function getNativeWindows() {
  try {
    const { stdout } = await execAsync('wmctrl -l -G -x -p');
    const lines = stdout.trim().split('\n').filter(Boolean);

    const result = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;

      const id = parts[0];
      const desk = parseInt(parts[1]);
      const x = parseInt(parts[2]);
      const y = parseInt(parts[3]);
      const width = parseInt(parts[4]);
      const height = parseInt(parts[5]);
      const pid = parseInt(parts[6]);
      const wmClass = (parts[7] || '').toLowerCase();
      const title = parts.slice(8).join(' ');

      if (desk === -1) continue;
      if (IGNORE_CLASS_PARTS.some((c) => wmClass.includes(c))) continue;

      let isMinimized = false;
      let isMaximized = false;
      try {
        const { stdout: stateOut } = await execAsync(`xprop -id ${id} _NET_WM_STATE`);
        isMinimized = stateOut.includes('_NET_WM_STATE_HIDDEN');
        isMaximized =
          stateOut.includes('_NET_WM_STATE_MAXIMIZED_VERT') &&
          stateOut.includes('_NET_WM_STATE_MAXIMIZED_HORZ');
      } catch (_) { }

      const icon = await resolveIconForWmClass(wmClass);
      result.push({ id, x, y, width, height, pid, wmClass, title, isMinimized, isMaximized, icon });
    }

    return result;
  } catch (_) {
    return [];
  }
}

function hashWindows(windows) {
  return windows
    .map((w) => `${w.id}|${w.x}|${w.y}|${w.width}|${w.height}|${w.title}|${w.isMinimized ? 'm' : ''}|${w.isMaximized ? 'M' : ''}|${w.icon ? 'i' : ''}`)
    .join(';');
}

async function tick() {
  if (!global.mainWindow || global.mainWindow.isDestroyed()) return;
  if (userInteracting) return;
  if (isBusy) return;
  isBusy = true;
  try {
    const windows = await getNativeWindows();
    const hash = hashWindows(windows);
    if (hash === lastHash) return;
    lastHash = hash;
    global.mainWindow.webContents.send('shell:native-windows-updated', windows);
  } finally {
    isBusy = false;
  }
}

export default function () {
  setTimeout(tick, 800);
  pollTimer = setInterval(tick, POLL_INTERVAL_MS);

  /* -------- Управление нативными окнами -------- */

  ipcMain.on('native-window:focus', async (_e, { id }) => {
    try { await execAsync(`wmctrl -i -a ${id}`); tick(); } catch (_) { }
  });

  ipcMain.on('native-window:close', async (_e, { id }) => {
    try { await execAsync(`wmctrl -i -c ${id}`); tick(); } catch (_) { }
  });

  ipcMain.on('native-window:minimize', async (_e, { id }) => {
    try { await execAsync(`xdotool windowminimize ${id}`); tick(); } catch (_) { }
  });

  // Нативная максимизация через EWMH. KWin сам применит.
  ipcMain.on('native-window:maximize', async (_e, { id, maximized }) => {
    try {
      if (maximized) {
        // было максимизировано → снять
        await execAsync(`wmctrl -i -r ${id} -b remove,maximized_vert,maximized_horz`);
      } else {
        // сначала снять (на случай странного состояния), потом добавить
        await execAsync(`wmctrl -i -r ${id} -b remove,maximized_vert,maximized_horz`).catch(() => { });
        await execAsync(`wmctrl -i -r ${id} -b add,maximized_vert,maximized_horz`);
      }
      tick();
    } catch (err) {
      console.error('[native-window:maximize]', err.message);
    }
  });

  ipcMain.on('native-window:move', async (_e, { id, x, y }) => {
    userInteracting = true;
    try {
      await execAsync(`wmctrl -i -r ${id} -e 0,${Math.round(x)},${Math.round(y)},-1,-1`);
    } catch (_) { }
  });

  // Ресайз через EWMH.
  ipcMain.on('native-window:resize', async (_e, { id, x, y, width, height }) => {
    userInteracting = true;
    try {
      await execAsync(`wmctrl -i -r ${id} -e 0,${Math.round(x)},${Math.round(y)},${Math.round(width)},${Math.round(height)}`);
    } catch (_) { }
  });

  ipcMain.on('native-window:release', () => {
    userInteracting = false;
  });

  ipcMain.handle('native-window:get-bounds', async (_e, { id }) => {
    try {
      const { stdout } = await execAsync(`xdotool getwindowgeometry --shell ${id}`);
      const lines = stdout.trim().split('\n');
      const get = (key) => {
        const l = lines.find((s) => s.startsWith(key + '='));
        return l ? parseInt(l.split('=')[1], 10) : 0;
      };
      return {
        x: get('X'),
        y: get('Y'),
        width: get('WIDTH'),
        height: get('HEIGHT'),
      };
    } catch (_) {
      return null;
    }
  });

  /* -------- KRunner -------- */
  let krunnerBusy = false;

  ipcMain.handle('shell:run-krunner', async () => {
    if (krunnerBusy) return { ok: true };
    krunnerBusy = true;
    try {
      try {
        await execAsync('qdbus org.kde.krunner /App display');
        return { ok: true, via: 'dbus' };
      } catch (_) { }
      const child = spawn('krunner', [], { detached: true, stdio: 'ignore' });
      child.unref();
      return { ok: true, via: 'spawn' };
    } catch (err) {
      console.error('[shell:run-krunner]', err.message);
      return { ok: false, error: err.message };
    } finally {
      setTimeout(() => { krunnerBusy = false; }, 300);
    }
  });

  ipcMain.handle('shell:systemsettings', async () => {
    try {
      const child = spawn('systemsettings', [], { detached: true, stdio: 'ignore' });
      child.unref();
      return { ok: true, via: 'spawn' };
    } catch (err) {
      console.error('[shell:systemsettings]', err.message);
      return { ok: false, error: err.message };
    }
  });
}