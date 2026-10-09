import electronPkg from 'electron';
const { ipcMain } = electronPkg;
import { spawn, execFile, exec } from 'child_process';
import { promisify } from 'util';
import { access, readFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';
import { getWindowById, getXidForWindow } from './ipc_windowManager.js';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/* Глобальная защита процесса                                         */
/* ------------------------------------------------------------------ */

// Никогда не падать от необработанных reject'ов — их у нас много,
// потому что X11 работает асинхронно, и окно может исчезнуть в любой момент.
process.on('unhandledRejection', (reason) => {
  if (DEBUG) console.warn('[nativeWindows] unhandledRejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  if (err && /X11|BadWindow|BadDrawable|BadMatch|BadValue|BadAtom/i.test(err.message || '')) {
    if (DEBUG) console.warn('[nativeWindows] uncaught X11 (ignored):', err.message);
    return;
  }
  console.error('[nativeWindows] uncaughtException:', err);
});

/* ------------------------------------------------------------------ */
/* Debug                                                               */
/* ------------------------------------------------------------------ */

const DEBUG = process.env.OMNI_NATIVE_DEBUG !== '0';
function dbg(...args) { if (DEBUG) console.log('[nativeWindows]', ...args); }
function dbgWarn(...args) { if (DEBUG) console.warn('[nativeWindows]', ...args); }

// Обёртка: любую async-функцию можно вызвать безопасно и не падать.
function safe(promise, label) {
  if (promise && typeof promise.catch === 'function') {
    promise.catch((e) => {
      if (DEBUG) dbgWarn(`[safe:${label || '?'}]`, e?.message || e);
    });
  }
  return promise;
}

/* ------------------------------------------------------------------ */
/* x11                                                                 */
/* ------------------------------------------------------------------ */

const require = createRequire(import.meta.url);
let x11 = null;
try {
  x11 = require('x11');
  dbg('x11 package loaded');
} catch {
  console.error('[nativeWindows] пакет "x11" не установлен. Выполните: npm install x11');
}

/* ------------------------------------------------------------------ */
/* xdotool / wmctrl                                                    */
/* ------------------------------------------------------------------ */

let xdotoolAvailable = false;
let wmctrlAvailable = false;

async function detectXdotool() {
  try {
    await execFileAsync('which', ['xdotool']);
    xdotoolAvailable = true;
    dbg('xdotool: найден');
  } catch {
    xdotoolAvailable = false;
    console.error('[nativeWindows] xdotool не найден. Установите: sudo apt install xdotool');
  }
}

async function detectWmctrl() {
  try {
    await execFileAsync('which', ['wmctrl']);
    wmctrlAvailable = true;
    dbg('wmctrl: найден');
  } catch {
    wmctrlAvailable = false;
    console.error('[nativeWindows] wmctrl не найден. Установите: sudo apt install wmctrl');
  }
}

async function runXdotool(args) {
  if (!xdotoolAvailable) return false;
  try {
    await execFileAsync('xdotool', args, { timeout: 2000 });
    return true;
  } catch (e) {
    dbgWarn('xdotool', args.join(' '), '→', e?.message || e);
    return false;
  }
}

async function runWmctrl(args) {
  if (!wmctrlAvailable) return false;
  try {
    await execFileAsync('wmctrl', args, { timeout: 2000 });
    return true;
  } catch (e) {
    dbgWarn('wmctrl', args.join(' '), '→', e?.message || e);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Настройки                                                           */
/* ------------------------------------------------------------------ */

const IGNORE_CLASS_PARTS = [
  'the_omniscience', 'the-omniscience', 'electron',
  'kwin', 'plasmashell', 'xfce4-panel', 'xfdesktop',
];

const ATOM_NAMES = [
  '_NET_CLIENT_LIST',
  '_NET_CLIENT_LIST_STACKING',
  '_NET_ACTIVE_WINDOW',
  '_NET_CURRENT_DESKTOP',
  '_NET_WM_STATE',
  '_NET_WM_NAME',
  '_NET_WM_PID',
  '_NET_WM_DESKTOP',
  '_NET_WM_WINDOW_TYPE',
  '_NET_WM_USER_TIME',
  'WM_NAME',
  'WM_CLASS',
  'WM_STATE',
  'WM_PROTOCOLS',
  'WM_DELETE_WINDOW',
  'WM_CHANGE_STATE',
  'UTF8_STRING',
  'STRING',
  '_NET_WM_STATE_HIDDEN',
  '_NET_WM_STATE_MAXIMIZED_VERT',
  '_NET_WM_STATE_MAXIMIZED_HORZ',
  '_NET_CLOSE_WINDOW',
];

const SEND_EVENT_MASK = x11
  ? (x11.eventMask.SubstructureRedirect | x11.eventMask.SubstructureNotify)
  : 0;

const REFRESH_DEBOUNCE_MS = 25;
const FOCUS_POLL_MS = 500;
const WATCHDOG_MS = 2000;
const POST_ACTION_REFRESH_MS = 250;

/* X11 «мягкие» коды, которые обычны при гонках с уже убитыми окнами:
 * 2  BadValue, 3 BadWindow, 5 BadAtom, 8 BadMatch, 9 BadDrawable.
 */
const SOFT_X11_CODES = new Set([2, 3, 5, 8, 9]);

/* ------------------------------------------------------------------ */
/* Shell XIDs                                                          */
/* ------------------------------------------------------------------ */

const SHELL_XIDS = new Set();

export function registerShellXid(xid) {
  if (!xid) return;
  SHELL_XIDS.add(String(xid).toLowerCase());
}

export function unregisterShellXid(xid) {
  if (!xid) return;
  SHELL_XIDS.delete(String(xid).toLowerCase());
}

function registerShellWindow(win, label) {
  if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) return;
  const doRegister = () => {
    try {
      const h = win.getNativeWindowHandle();
      if (!h || h.length < 4) return false;
      const xid = '0x' + (h.readUInt32LE(0) >>> 0).toString(16).padStart(8, '0');
      registerShellXid(xid);
      dbg(`registered ${label} shell xid=${xid}`);
      return true;
    } catch { return false; }
  };
  if (!doRegister()) {
    try { win.once('ready-to-show', doRegister); } catch { /* ignore */ }
  }
}

/* ------------------------------------------------------------------ */
/* Иконки                                                              */
/* ------------------------------------------------------------------ */

const ICON_CACHE = new Map();
const WMCLASS_TO_APP = new Map();

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
      : ext === 'png' ? 'image/png' : 'image/x-xpixmap';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch { return null; }
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
        } catch { /* next */ }
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
    if (icon) { WMCLASS_TO_APP.set(wmClass, name); return icon; }
  }
  WMCLASS_TO_APP.set(wmClass, '');
  return null;
}

/* ------------------------------------------------------------------ */
/* X11: утилиты                                                        */
/* ------------------------------------------------------------------ */

function xidToHex(xid) {
  return '0x' + (xid >>> 0).toString(16).padStart(8, '0').toLowerCase();
}

function parseXid(id) {
  if (typeof id === 'number') return id >>> 0;
  const s = String(id).trim();
  if (s.startsWith('0x') || s.startsWith('0X')) return parseInt(s, 16) >>> 0;
  const n = parseInt(s, 16);
  return Number.isFinite(n) ? (n >>> 0) : 0;
}

function num(v, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function internAtoms(X, names) {
  return new Promise((resolve) => {
    const atoms = {};
    let pending = names.length;
    if (!pending) return resolve(atoms);
    for (const name of names) {
      try {
        X.InternAtom(false, name, (err, atom) => {
          atoms[name] = err ? 0 : atom;
          if (--pending === 0) resolve(atoms);
        });
      } catch {
        atoms[name] = 0;
        if (--pending === 0) resolve(atoms);
      }
    }
  });
}

function getProperty(X, win, atom, typeAtom = 0) {
  return new Promise((resolve) => {
    if (!atom || !win) return resolve(null);
    try {
      X.GetProperty(0, win, atom, typeAtom, 0, 0x1fffffff, (err, prop) => {
        if (err || !prop || !prop.data || prop.data.length === 0) return resolve(null);
        resolve(prop);
      });
    } catch { resolve(null); }
  });
}

function readU32At(buf, off) {
  if (Buffer.isBuffer(buf)) return buf.readUInt32LE(off);
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(off, true);
}

async function readClientList(X, root, atom) {
  const prop = await getProperty(X, root, atom);
  if (!prop || !prop.data) return [];
  const ids = [];
  for (let i = 0; i + 4 <= prop.data.length; i += 4) ids.push(readU32At(prop.data, i) >>> 0);
  return ids;
}

async function readWmStateAtoms(X, win, atom) {
  const prop = await getProperty(X, win, atom);
  if (!prop || !prop.data) return [];
  const out = [];
  for (let i = 0; i + 4 <= prop.data.length; i += 4) out.push(readU32At(prop.data, i) >>> 0);
  return out;
}

async function readIcccmState(X, win, atom) {
  const prop = await getProperty(X, win, atom);
  if (!prop || !prop.data || prop.data.length < 4) return 0;
  return readU32At(prop.data, 0);
}

function parseWmState(atoms, atomMap, icccmState = 0) {
  const iconic = (icccmState === 3);
  const hiddenByEwmh = atoms.includes(atomMap._NET_WM_STATE_HIDDEN);
  return {
    minimized: iconic || hiddenByEwmh,
    maximized:
      atoms.includes(atomMap._NET_WM_STATE_MAXIMIZED_VERT) &&
      atoms.includes(atomMap._NET_WM_STATE_MAXIMIZED_HORZ),
  };
}

async function readWindowTitle(X, win, atomMap) {
  const utf8 = await getProperty(X, win, atomMap._NET_WM_NAME, atomMap.UTF8_STRING);
  if (utf8 && utf8.data) return utf8.data.toString('utf8').replace(/\0+$/, '');
  const name = await getProperty(X, win, atomMap.WM_NAME, 0);
  if (name && name.data) return name.data.toString('latin1').replace(/\0+$/, '');
  return '';
}

async function readWmClass(X, win, atom) {
  const prop = await getProperty(X, win, atom);
  if (!prop || !prop.data) return '';
  const str = prop.data.toString('latin1');
  const parts = str.split('\0').filter(Boolean);
  return (parts[1] || parts[0] || '').toLowerCase();
}

async function readPid(X, win, atom) {
  const prop = await getProperty(X, win, atom);
  if (!prop || !prop.data) return 0;
  return readU32At(prop.data, 0);
}

async function readDesktop(X, win, atom) {
  const prop = await getProperty(X, win, atom);
  if (!prop || !prop.data) return 0;
  return readU32At(prop.data, 0);
}

function getGeometry(X, win, root) {
  return new Promise((resolve) => {
    if (!win) return resolve(null);
    try {
      X.GetGeometry(win, (err, geo) => {
        if (err || !geo) return resolve(null);
        const width = num(geo.width, 0);
        const height = num(geo.height, 0);
        const localX = num(geo.x, 0);
        const localY = num(geo.y, 0);
        try {
          X.TranslateCoordinates(win, root, 0, 0, (err2, tc) => {
            if (err2 || !tc) return resolve({ x: localX, y: localY, width, height });
            const dstX = tc.dstX ?? tc.destX ?? tc.dst_x ?? tc.x;
            const dstY = tc.dstY ?? tc.destY ?? tc.dst_y ?? tc.y;
            const x = num(dstX, NaN);
            const y = num(dstY, NaN);
            if (Number.isFinite(x) && Number.isFinite(y)) {
              resolve({ x, y, width, height });
            } else {
              resolve({ x: localX, y: localY, width, height });
            }
          });
        } catch {
          resolve({ x: localX, y: localY, width, height });
        }
      });
    } catch { resolve(null); }
  });
}

function getActiveXidRaw(X, root, atom) {
  return new Promise((resolve) => {
    if (!atom) return resolve(null);
    try {
      X.GetProperty(0, root, atom, 0, 0, 4, (err, prop) => {
        if (err || !prop || !prop.data || prop.data.length < 4) return resolve(null);
        const win = readU32At(prop.data, 0) >>> 0;
        resolve(win ? win : null);
      });
    } catch { resolve(null); }
  });
}

function getInputFocus(X) {
  return new Promise((resolve) => {
    try {
      X.GetInputFocus((err, focus) => {
        if (err || !focus) return resolve(null);
        const xid = (focus.focus >>> 0);
        if (!xid || xid === 1) return resolve(null);
        resolve(xid);
      });
    } catch { resolve(null); }
  });
}

function queryTree(X, win) {
  return new Promise((resolve) => {
    if (!win) return resolve(null);
    try {
      X.QueryTree(win, (err, tree) => {
        if (err || !tree) return resolve(null);
        resolve(tree);
      });
    } catch { resolve(null); }
  });
}

function warpPointer(X, root, x, y) {
  return new Promise((resolve) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      dbgWarn('warpPointer: невалидные координаты', x, y);
      return resolve(false);
    }
    try {
      X.WarpPointer(0, root, 0, 0, 0, 0,
        Math.max(0, Math.round(x)), Math.max(0, Math.round(y)),
        (err) => resolve(!err));
    } catch { resolve(false); }
  });
}

/* ------------------------------------------------------------------ */
/* ClientMessage                                                       */
/* ------------------------------------------------------------------ */

function sendClientMessage(X, root, targetWin, messageType, data) {
  return new Promise((resolve) => {
    if (!messageType || !targetWin) return resolve(false);
    const event = {
      type: 33, format: 32, window: targetWin,
      message_type: messageType,
      data: data || [0, 0, 0, 0, 0],
    };
    try {
      X.SendEvent(root, false, SEND_EVENT_MASK, event, () => resolve(true));
    } catch { resolve(false); }
  });
}

function activateWindowX11(X, root, atomMap, win, timestamp = 0) {
  return sendClientMessage(X, root, win, atomMap._NET_ACTIVE_WINDOW,
    [2, (timestamp >>> 0), 0, 0, 0]);
}

function setInputFocusDirect(X, win, timestamp = 0) {
  return new Promise((resolve) => {
    if (!win) return resolve(false);
    try { X.SetInputFocus(win, 1, (timestamp >>> 0), (err) => resolve(!err)); }
    catch { resolve(false); }
  });
}

function raiseWindowX11(X, win) {
  return new Promise((resolve) => {
    if (!win) return resolve(false);
    try { X.ConfigureWindow(win, { stackMode: 0 }, (err) => resolve(!err)); }
    catch { resolve(false); }
  });
}

function closeWindowX11(X, root, atomMap, win, timestamp = 0) {
  return sendClientMessage(X, root, win, atomMap._NET_CLOSE_WINDOW,
    [(timestamp >>> 0), 2, 0, 0, 0]);
}

function sendWmDeleteWindow(X, win, atomMap, timestamp = 0) {
  return new Promise((resolve) => {
    const wmProtocols = atomMap.WM_PROTOCOLS;
    const wmDelete = atomMap.WM_DELETE_WINDOW;
    if (!wmProtocols || !wmDelete || !win) return resolve(false);
    const event = {
      type: 33, format: 32, window: win,
      message_type: wmProtocols,
      data: [wmDelete, (timestamp >>> 0), 0, 0, 0],
    };
    try { X.SendEvent(win, false, 0, event, () => resolve(true)); }
    catch { resolve(false); }
  });
}

function moveResizeWindowX11(X, win, x, y, width, height) {
  return new Promise((resolve) => {
    if (!win) return resolve(false);
    try {
      const opts = {};
      if (Number.isFinite(x)) opts.x = Math.round(x);
      if (Number.isFinite(y)) opts.y = Math.round(y);
      if (Number.isFinite(width)) opts.width = Math.max(1, Math.round(width));
      if (Number.isFinite(height)) opts.height = Math.max(1, Math.round(height));
      if (!Object.keys(opts).length) return resolve(false);
      X.ConfigureWindow(win, opts, (err) => resolve(!err));
    } catch { resolve(false); }
  });
}

/* ------------------------------------------------------------------ */
/* computeDragTarget                                                   */
/* ------------------------------------------------------------------ */

function computeDragTarget(mode, direction, frameGeo, clientGeo) {
  const fx = num(frameGeo?.x, num(clientGeo?.x, 0));
  const fw = num(frameGeo?.width, num(clientGeo?.width, 0));
  const cy = num(clientGeo?.y, num(frameGeo?.y, 0));
  const ch = num(clientGeo?.height, num(frameGeo?.height, 0));

  const xL = fx;
  const xR = fx + fw - 1;
  const xC = Math.round(fx + fw / 2);
  const yT = cy;
  const yB = cy + ch - 1;
  const yC = Math.round(cy + ch / 2);

  if (mode === 'move') return { x: xC, y: yT + 15 };

  switch (direction) {
    case 'nw': return { x: xL, y: yT };
    case 'n':  return { x: xC, y: yT };
    case 'ne': return { x: xR, y: yT };
    case 'e':  return { x: xR, y: yC };
    case 'se': return { x: xR, y: yB };
    case 's':  return { x: xC, y: yB };
    case 'sw': return { x: xL, y: yB };
    case 'w':  return { x: xL, y: yC };
  }
  return { x: xC, y: yT + 15 };
}

/* ------------------------------------------------------------------ */
/* Self-test                                                           */
/* ------------------------------------------------------------------ */

function spawnXprop(args) {
  return new Promise((resolve) => {
    const p = spawn('xprop', args);
    let out = '';
    p.stdout.on('data', (d) => { out += d.toString(); });
    p.on('error', () => resolve(''));
    p.on('exit', () => resolve(out.trim()));
  });
}

async function selfTestDump() {
  if (!DEBUG) return;
  try {
    const [active, clients] = await Promise.all([
      spawnXprop(['-root', '-notype', '_NET_ACTIVE_WINDOW']),
      spawnXprop(['-root', '-notype', '_NET_CLIENT_LIST']),
    ]);
    console.log('[nativeWindows][selftest] _NET_ACTIVE_WINDOW:', active || '(empty)');
    console.log('[nativeWindows][selftest] _NET_CLIENT_LIST:', clients);
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* Watcher                                                             */
/* ------------------------------------------------------------------ */

class X11Watcher {
  constructor({ onUpdate }) {
    this.onUpdate = onUpdate;
    this.windows = new Map();
    this.frameToClient = new Map();
    this.brokenWindows = new Set(); // XID → в этой сессии давал BadWindow, не трогаем
    this.activeXid = null;

    this.X = null;
    this.root = null;
    this.atomMap = null;

    this.destroyed = false;

    this.refreshTimer = null;
    this.focusPollTimer = null;
    this.watchdogTimer = null;

    this.refreshing = false;
    this.pendingRefresh = false;
    this.lastHash = '';

    this.lastEventTime = 0;
    this.suppressEmit = false;
  }

  start() {
    if (!x11) return;
    x11.createClient((err, display) => {
      if (this.destroyed) return;
      if (err) {
        console.error('[nativeWindows] createClient:', err.message || err);
        return;
      }
      this.X = display.client;
      this.root = display.screen[0].root;
      dbg('createClient OK. root =', xidToHex(this.root));

      // ГЛАВНАЯ защита: X11-ошибки приходят сюда в любом месте.
      // BadWindow/BadDrawable/BadMatch/BadValue/BadAtom — тихо глотаем,
      // это нормальные гонки при работе с чужими окнами.
      this.X.on('error', (e) => {
        const code = e?.errorCode;
        if (SOFT_X11_CODES.has(code)) {
          if (DEBUG) dbg('X11 soft error (ignored): code =', code);
          return;
        }
        console.error('[nativeWindows] X11 error:', e?.message || e, code);
      });

      internAtoms(this.X, ATOM_NAMES).then((atomMap) => {
        if (this.destroyed) return;
        this.atomMap = atomMap;
        this.attachRoot();
        this.refreshAll();
        selfTestDump();

        this.focusPollTimer = setInterval(() => {
          if (this.destroyed) return;
          safe(this.applyActiveXid(), 'applyActiveXid');
        }, FOCUS_POLL_MS);

        this.watchdogTimer = setInterval(() => {
          if (this.destroyed) return;
          this.scheduleRefresh();
          for (const win of this.windows.keys()) {
            safe(this.refreshWmState(win), 'watchdog.refreshWmState');
          }
        }, WATCHDOG_MS);
      }).catch((e) => {
        console.error('[nativeWindows] internAtoms failed:', e?.message || e);
      });
    });
  }

  stop() {
    this.destroyed = true;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (this.focusPollTimer) clearInterval(this.focusPollTimer);
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.refreshTimer = null;
    this.focusPollTimer = null;
    this.watchdogTimer = null;
    if (this.X) { try { this.X.terminate(); } catch { /* ignore */ } }
  }

  markBroken(win, reason) {
    if (!win) return;
    if (!this.brokenWindows.has(win)) {
      this.brokenWindows.add(win);
      if (DEBUG) dbgWarn('markBroken', xidToHex(win), reason || '');
    }
    // Убираем из активного кэша — больше не пытаемся
    this.windows.delete(win);
    for (const [f, c] of [...this.frameToClient.entries()]) {
      if (c === win) this.frameToClient.delete(f);
    }
  }

  attachRoot() {
    try {
      const em = x11.eventMask;
      const mask = em.SubstructureNotify | em.PropertyChange;
      this.X.ChangeWindowAttributes(this.root, { eventMask: mask }, (err) => {
        if (err && !SOFT_X11_CODES.has(err?.errorCode)) {
          console.error('[nativeWindows] ChangeWindowAttributes(root):', err.message || err);
        }
      });
    } catch (e) {
      console.error('[nativeWindows] attachRoot failed:', e?.message || e);
    }

    this.X.on('event', (ev) => {
      try {
        if (ev && typeof ev.time === 'number' && ev.time > this.lastEventTime) {
          this.lastEventTime = ev.time;
        }
        this.handleEvent(ev);
      } catch (e) {
        if (DEBUG) dbgWarn('handleEvent error:', e?.message || e);
      }
    });
  }

  handleEvent(ev) {
    if (this.destroyed || !this.atomMap) return;
    const t = ev.name;

    if (t === 'PropertyNotify') {
      if (ev.window === this.root) {
        if (ev.atom === this.atomMap._NET_ACTIVE_WINDOW) safe(this.applyActiveXid(), 'applyActiveXid');
        if (ev.atom === this.atomMap._NET_CLIENT_LIST ||
            ev.atom === this.atomMap._NET_CLIENT_LIST_STACKING) this.scheduleRefresh();
        return;
      }
      const rec = this.windows.get(ev.window);
      if (!rec) return;
      if (ev.atom === this.atomMap._NET_WM_STATE ||
          ev.atom === this.atomMap.WM_STATE) {
        safe(this.refreshWmState(ev.window), 'refreshWmState');
      } else if (ev.atom === this.atomMap._NET_WM_NAME ||
                 ev.atom === this.atomMap.WM_NAME) {
        safe(this.refreshTitle(ev.window), 'refreshTitle');
      }
      return;
    }

    if (ev.window === this.root &&
        (t === 'CreateNotify' || t === 'MapNotify' ||
         t === 'UnmapNotify' || t === 'DestroyNotify' ||
         t === 'ReparentNotify')) {
      this.scheduleRefresh();
      return;
    }

    if (t === 'ConfigureNotify') {
      if (this.windows.has(ev.window)) safe(this.refreshGeometry(ev.window), 'refreshGeometry');
      return;
    }

    if (t === 'DestroyNotify') {
      if (this.windows.delete(ev.window)) {
        for (const [f, c] of [...this.frameToClient.entries()]) {
          if (c === ev.window) this.frameToClient.delete(f);
        }
        this.emit();
      }
      return;
    }

    if (t === 'MapNotify' || t === 'UnmapNotify') {
      if (this.windows.has(ev.window)) safe(this.refreshWmState(ev.window), 'refreshWmState');
    }
  }

  scheduleRefresh() {
    if (this.destroyed || this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      safe(this.refreshAll(), 'refreshAll');
    }, REFRESH_DEBOUNCE_MS);
  }

  forceRefreshSoon(ms = POST_ACTION_REFRESH_MS) {
    setTimeout(() => {
      if (!this.destroyed) safe(this.refreshAll(), 'forceRefreshSoon');
    }, ms);
  }

  resolveToClientXid(xid) {
    if (this.windows.has(xid)) return xid;
    const mapped = this.frameToClient.get(xid);
    if (mapped && this.windows.has(mapped)) return mapped;
    return null;
  }

  async readActiveXid() {
    try {
      const focusXid = await getInputFocus(this.X);
      if (focusXid) {
        const resolved = this.resolveToClientXid(focusXid);
        if (resolved != null) {
          const hex = xidToHex(resolved);
          if (!SHELL_XIDS.has(hex)) return hex;
        }
      }
      const rawNum = await getActiveXidRaw(this.X, this.root, this.atomMap._NET_ACTIVE_WINDOW);
      if (rawNum) {
        const resolved = this.resolveToClientXid(rawNum) ?? rawNum;
        const hex = xidToHex(resolved);
        if (!SHELL_XIDS.has(hex)) return hex;
      }
    } catch (e) {
      if (DEBUG) dbgWarn('readActiveXid error:', e?.message || e);
    }
    return this.activeXid;
  }

  async applyActiveXid() {
    try {
      const next = await this.readActiveXid();
      if (next === this.activeXid) return;
      this.activeXid = next;
      this.emit();
    } catch (e) {
      if (DEBUG) dbgWarn('applyActiveXid error:', e?.message || e);
    }
  }

  async refreshAll() {
    if (this.destroyed || !this.X || !this.atomMap) return;
    if (this.refreshing) { this.pendingRefresh = true; return; }
    this.refreshing = true;
    try {
      const ids = await readClientList(this.X, this.root, this.atomMap._NET_CLIENT_LIST);
      const seen = new Set();

      for (const win of ids) {
        if (!win || this.brokenWindows.has(win)) continue;
        seen.add(win);
        let rec = this.windows.get(win);
        if (!rec) {
          let wmClass = '';
          let title = '';
          let stateAtoms = [];
          let icccmState = 0;
          let pid = 0;
          let desk = 0;
          let geo = null;
          try {
            [wmClass, title, stateAtoms, icccmState, pid, desk, geo] = await Promise.all([
              readWmClass(this.X, win, this.atomMap.WM_CLASS),
              readWindowTitle(this.X, win, this.atomMap),
              readWmStateAtoms(this.X, win, this.atomMap._NET_WM_STATE),
              readIcccmState(this.X, win, this.atomMap.WM_STATE),
              readPid(this.X, win, this.atomMap._NET_WM_PID),
              readDesktop(this.X, win, this.atomMap._NET_WM_DESKTOP),
              getGeometry(this.X, win, this.root),
            ]);
          } catch (e) {
            if (DEBUG) dbgWarn('read props for', xidToHex(win), ':', e?.message || e);
          }

          if (IGNORE_CLASS_PARTS.some((c) => wmClass.includes(c))) continue;

          const { minimized, maximized } = parseWmState(stateAtoms, this.atomMap, icccmState);
          let icon = null;
          try { icon = await resolveIconForWmClass(wmClass); } catch { /* ignore */ }

          rec = {
            id: xidToHex(win),
            xid: win,
            frameXid: null,
            x: num(geo?.x, 0),
            y: num(geo?.y, 0),
            width: num(geo?.width, 0),
            height: num(geo?.height, 0),
            pid, desk, wmClass, title,
            isMinimized: minimized,
            isMaximized: maximized,
            icon,
          };
          this.windows.set(win, rec);
          this.subscribeToWindow(win);

          try {
            const tree = await queryTree(this.X, win);
            if (tree && tree.parent && tree.parent !== this.root) {
              this.frameToClient.set(tree.parent, win);
              rec.frameXid = tree.parent;
            }
          } catch { /* ignore */ }
        } else {
          try {
            const geo = await getGeometry(this.X, win, this.root);
            if (geo) {
              rec.x = num(geo.x, rec.x);
              rec.y = num(geo.y, rec.y);
              rec.width = num(geo.width, rec.width);
              rec.height = num(geo.height, rec.height);
            }
          } catch { /* ignore */ }
        }
      }

      for (const win of [...this.windows.keys()]) {
        if (!seen.has(win)) {
          this.windows.delete(win);
          for (const [f, c] of [...this.frameToClient.entries()]) {
            if (c === win) this.frameToClient.delete(f);
          }
        }
      }

      this.activeXid = await this.readActiveXid();
      this.emit(true);
    } catch (e) {
      if (DEBUG) dbgWarn('refreshAll fatal:', e?.message || e);
    } finally {
      this.refreshing = false;
      if (this.pendingRefresh) {
        this.pendingRefresh = false;
        this.scheduleRefresh();
      }
    }
  }

  subscribeToWindow(win) {
    if (!this.X || !win) return;
    try {
      const em = x11.eventMask;
      this.X.ChangeWindowAttributes(win, {
        eventMask: em.StructureNotify | em.PropertyChange,
      }, (err) => {
        if (err && SOFT_X11_CODES.has(err?.errorCode)) {
          // окно уже умерло между добавлением в список и подпиской
          this.markBroken(win, 'subscribeToWindow: ' + (err.message || err.errorCode));
        }
      });
    } catch { /* окно могло умереть */ }
  }

  async refreshWmState(win) {
    const rec = this.windows.get(win);
    if (!rec) return;
    try {
      const [atoms, icccm] = await Promise.all([
        readWmStateAtoms(this.X, win, this.atomMap._NET_WM_STATE),
        readIcccmState(this.X, win, this.atomMap.WM_STATE),
      ]);
      const { minimized, maximized } = parseWmState(atoms, this.atomMap, icccm);
      if (rec.isMinimized === minimized && rec.isMaximized === maximized) return;
      rec.isMinimized = minimized;
      rec.isMaximized = maximized;
      this.emit();
    } catch (e) {
      if (DEBUG) dbgWarn('refreshWmState error:', e?.message || e);
    }
  }

  async isMinimizedNow(win) {
    try {
      const icccm = await readIcccmState(this.X, win, this.atomMap.WM_STATE);
      if (icccm === 3) return true;
      const atoms = await readWmStateAtoms(this.X, win, this.atomMap._NET_WM_STATE);
      return atoms.includes(this.atomMap._NET_WM_STATE_HIDDEN);
    } catch { return false; }
  }

  async isMaximizedNow(win) {
    try {
      const atoms = await readWmStateAtoms(this.X, win, this.atomMap._NET_WM_STATE);
      return atoms.includes(this.atomMap._NET_WM_STATE_MAXIMIZED_VERT) &&
             atoms.includes(this.atomMap._NET_WM_STATE_MAXIMIZED_HORZ);
    } catch { return false; }
  }

  async refreshTitle(win) {
    const rec = this.windows.get(win);
    if (!rec) return;
    try {
      const title = await readWindowTitle(this.X, win, this.atomMap);
      if (rec.title === title) return;
      rec.title = title;
      this.emit();
    } catch { /* ignore */ }
  }

  async refreshGeometry(win) {
    const rec = this.windows.get(win);
    if (!rec) return;
    try {
      const geo = await getGeometry(this.X, win, this.root);
      if (!geo) return;
      const x = num(geo.x, rec.x);
      const y = num(geo.y, rec.y);
      const width = num(geo.width, rec.width);
      const height = num(geo.height, rec.height);
      if (rec.x === x && rec.y === y && rec.width === width && rec.height === height) return;
      rec.x = x; rec.y = y; rec.width = width; rec.height = height;
      this.emit();
    } catch { /* ignore */ }
  }

  emit(force = false) {
    try {
      const payload = [...this.windows.values()];
      const hash = payload
        .map((w) => `${w.id},${w.x},${w.y},${w.width},${w.height},${w.title},`
          + `${w.isMinimized ? 1 : 0},${w.isMaximized ? 1 : 0},${w.icon ? 1 : 0}`)
        .join(';') + '|' + (this.activeXid || '');
      if (!force && hash === this.lastHash) return;
      this.lastHash = hash;
      if (this.suppressEmit) return;
      this.onUpdate(payload, this.activeXid);
    } catch (e) {
      if (DEBUG) dbgWarn('emit error:', e?.message || e);
    }
  }

  /* ---------------- управление ---------------- */

  async focus(win) {
    if (!this.X) return false;
    const hex = xidToHex(win);
    try {
      const minimized = await this.isMinimizedNow(win);
      if (minimized) {
        dbg('focus: minimized → wmctrl -ia', hex);
        await runWmctrl(['-i', '-a', hex]);
        await new Promise((r) => setTimeout(r, 200));
        this.forceRefreshSoon(100);
        return true;
      }

      const ts = this.lastEventTime || 0;
      await activateWindowX11(this.X, this.root, this.atomMap, win, ts);
      await new Promise((r) => setTimeout(r, 150));
      let cur = await getInputFocus(this.X);
      let resolved = cur != null ? this.resolveToClientXid(cur) : null;
      if (resolved === win) { this.forceRefreshSoon(150); return true; }

      await raiseWindowX11(this.X, win);
      await setInputFocusDirect(this.X, win, ts);
      await new Promise((r) => setTimeout(r, 100));
      cur = await getInputFocus(this.X);
      resolved = cur != null ? this.resolveToClientXid(cur) : null;
      if (resolved === win) { this.forceRefreshSoon(150); return true; }

      dbg('focus: fallback → wmctrl -ia', hex);
      await runWmctrl(['-i', '-a', hex]);
      await new Promise((r) => setTimeout(r, 150));
      this.forceRefreshSoon(100);
      return true;
    } catch (e) {
      if (DEBUG) dbgWarn('focus error:', e?.message || e);
      return false;
    }
  }

  async close(win) {
    if (!this.X) return false;
    const ts = this.lastEventTime || 0;
    try {
      try { await setInputFocusDirect(this.X, win, ts); } catch { /* ignore */ }
      await new Promise((r) => setTimeout(r, 60));

      await closeWindowX11(this.X, this.root, this.atomMap, win, ts);
      await new Promise((r) => setTimeout(r, 200));
      if (!this.windows.has(win)) return true;

      await sendWmDeleteWindow(this.X, win, this.atomMap, ts);
      await new Promise((r) => setTimeout(r, 200));
      if (!this.windows.has(win)) return true;

      return await new Promise((resolve) => {
        try { this.X.KillClient(win, (err) => resolve(!err)); }
        catch { resolve(false); }
      });
    } catch (e) {
      if (DEBUG) dbgWarn('close error:', e?.message || e);
      return false;
    }
  }

  async minimize(win) {
    const hex = xidToHex(win);
    try {
      const min = await this.isMinimizedNow(win);
      if (min) { dbg('minimize: уже свёрнуто'); return true; }

      dbg('minimize via xdotool:', hex);
      const ok = await runXdotool(['windowminimize', hex]);
      this.forceRefreshSoon();
      return ok;
    } catch (e) {
      if (DEBUG) dbgWarn('minimize error:', e?.message || e);
      return false;
    }
  }

  async maximize(win, _ignoredFromUi) {
    const hex = xidToHex(win);
    try {
      const isMax = await this.isMaximizedNow(win);
      const prop = isMax
        ? 'remove,maximized_vert,maximized_horz'
        : 'add,maximized_vert,maximized_horz';
      dbg('maximize via wmctrl:', hex, isMax ? '(was max → unmax)' : '(was normal → max)');
      const ok = await runWmctrl(['-i', '-r', hex, '-b', prop]);
      this.forceRefreshSoon();
      return ok;
    } catch (e) {
      if (DEBUG) dbgWarn('maximize error:', e?.message || e);
      return false;
    }
  }

  async setBounds(win, bounds) {
    if (!this.X) return false;
    return moveResizeWindowX11(this.X, win, bounds.x, bounds.y, bounds.width, bounds.height);
  }
}

/* ------------------------------------------------------------------ */
/* Модуль                                                              */
/* ------------------------------------------------------------------ */

let watcher = null;
let initialized = false;

export function getNativeState() {
  if (!watcher) return { windows: [], activeXid: null };
  try {
    const all = [...watcher.windows.values()];
    const filtered = all.filter((w) => {
      const x = String(w.id || '').toLowerCase();
      return x && !SHELL_XIDS.has(x);
    });
    return { windows: filtered, activeXid: watcher.activeXid };
  } catch {
    return { windows: [], activeXid: null };
  }
}

export function isX11Available() { return !!(watcher && watcher.X); }

function resolveTarget(id) {
  if (id == null) return null;
  try {
    const our = getWindowById(id);
    if (our) {
      const xidHex = getXidForWindow(id);
      if (!xidHex) return { kind: 'our', xid: null, appId: id };
      return { kind: 'our', xid: parseXid(xidHex), appId: id };
    }
    const xid = parseXid(id);
    if (!xid) return null;
    return { kind: 'native', xid };
  } catch {
    return null;
  }
}

/* ---------- Публичные операции ---------- */

export async function focusWindowById(id) {
  try {
    const t = resolveTarget(id);
    if (!t) return { ok: false };
    if (t.kind === 'our') {
      const w = getWindowById(t.appId);
      try {
        if (w.isMinimized()) w.restore();
        w.show(); w.focus(); w.moveTop();
      } catch { /* ignore */ }
    }
    if (t.xid != null && watcher) {
      const ok = await watcher.focus(t.xid);
      watcher.scheduleRefresh();
      return { ok };
    }
    return { ok: true };
  } catch (e) {
    if (DEBUG) dbgWarn('focusWindowById error:', e?.message || e);
    return { ok: false };
  }
}

export async function closeWindowById(id) {
  try {
    const t = resolveTarget(id);
    if (!t) return { ok: false };
    if (t.kind === 'our') {
      const w = getWindowById(t.appId);
      if (w) w.close();
      return { ok: true };
    }
    if (t.xid != null && watcher) {
      const ok = await watcher.close(t.xid);
      watcher.scheduleRefresh();
      return { ok };
    }
    return { ok: false };
  } catch (e) {
    if (DEBUG) dbgWarn('closeWindowById error:', e?.message || e);
    return { ok: false };
  }
}

export async function minimizeWindowById(id) {
  try {
    const t = resolveTarget(id);
    if (!t) return { ok: false };
    if (t.kind === 'our') {
      const w = getWindowById(t.appId);
      if (w) w.minimize();
      return { ok: true };
    }
    if (t.xid != null && watcher) {
      const ok = await watcher.minimize(t.xid);
      return { ok };
    }
    return { ok: false };
  } catch (e) {
    if (DEBUG) dbgWarn('minimizeWindowById error:', e?.message || e);
    return { ok: false };
  }
}

export async function maximizeWindowById(id, maximized) {
  try {
    const t = resolveTarget(id);
    if (!t) return { ok: false };
    if (t.kind === 'our') {
      const w = getWindowById(t.appId);
      if (w) { if (maximized) w.unmaximize(); else w.maximize(); }
      return { ok: true };
    }
    if (t.xid != null && watcher) {
      const ok = await watcher.maximize(t.xid, maximized);
      return { ok };
    }
    return { ok: false };
  } catch (e) {
    if (DEBUG) dbgWarn('maximizeWindowById error:', e?.message || e);
    return { ok: false };
  }
}

/* ------------------------------------------------------------------ */
/* export default                                                      */
/* ------------------------------------------------------------------ */

export default async function () {
  if (initialized) return;
  initialized = true;

  try { await detectXdotool(); } catch { /* ignore */ }
  try { await detectWmctrl(); } catch { /* ignore */ }

  registerShellWindow(global.topbarWindow, 'topbar');
  registerShellWindow(global.mainWindow, 'main');

  watcher = new X11Watcher({
    onUpdate: (windows, activeXid) => {
      try {
        global.__lastNativeWindows = windows;
        global.__activeXid = activeXid;
        global.topbarBroadcast?.();
        if (global.mainWindow && !global.mainWindow.isDestroyed()) {
          global.mainWindow.webContents.send('shell:native-windows-updated', windows);
        }
      } catch (e) {
        if (DEBUG) dbgWarn('onUpdate error:', e?.message || e);
      }
    },
  });
  watcher.start();

  /* -------- prepare-drag -------- */
  ipcMain.handle('native-window:prepare-drag', async (_e, { id, mode, direction }) => {
    try {
      const t = resolveTarget(id);
      if (!t || !watcher || !watcher.X) return { ok: false };

      if (t.kind === 'our') {
        const w = getWindowById(t.appId);
        if (!w) return { ok: false };
        const b = w.getBounds();
        const bounds = {
          x: num(b.x), y: num(b.y),
          width: num(b.width), height: num(b.height),
        };
        const target = computeDragTarget(mode, direction, bounds, bounds);
        const warped = await warpPointer(watcher.X, watcher.root, target.x, target.y);
        return { ok: true, kind: 'our', cursor: target, bounds };
      }

      const clientGeo = await getGeometry(watcher.X, t.xid, watcher.root);
      if (!clientGeo) return { ok: false };

      let frameGeo = null;
      const rec = watcher.windows.get(t.xid);
      if (rec && rec.frameXid) {
        frameGeo = await getGeometry(watcher.X, rec.frameXid, watcher.root);
      }

      const target = computeDragTarget(mode, direction, frameGeo, clientGeo);
      const warped = await warpPointer(watcher.X, watcher.root, target.x, target.y);

      return { ok: true, kind: 'native', cursor: target, bounds: clientGeo };
    } catch (e) {
      if (DEBUG) dbgWarn('prepare-drag error:', e?.message || e);
      return { ok: false };
    }
  });

  /* -------- set-bounds -------- */
  ipcMain.on('native-window:set-bounds', async (_e, { id, bounds }) => {
    try {
      const t = resolveTarget(id);
      if (!t || !bounds) return;

      if (t.kind === 'our') {
        const w = getWindowById(t.appId);
        if (w) {
          w.setBounds({
            x: Math.round(num(bounds.x)),
            y: Math.round(num(bounds.y)),
            width: Math.round(num(bounds.width, 100)),
            height: Math.round(num(bounds.height, 100)),
          });
        }
        return;
      }
      if (t.xid != null && watcher) {
        watcher.suppressEmit = true;
        await watcher.setBounds(t.xid, bounds);
        const rec = watcher.windows.get(t.xid);
        if (rec) {
          rec.x = Math.round(num(bounds.x, rec.x));
          rec.y = Math.round(num(bounds.y, rec.y));
          rec.width = Math.round(num(bounds.width, rec.width));
          rec.height = Math.round(num(bounds.height, rec.height));
        }
        watcher.suppressEmit = false;
      }
    } catch (e) {
      if (watcher) watcher.suppressEmit = false;
      if (DEBUG) dbgWarn('set-bounds error:', e?.message || e);
    }
  });

  ipcMain.on('native-window:drag-end', () => {
    try { watcher?.scheduleRefresh(); } catch { /* ignore */ }
  });

  /* -------- прямые IPC-каналы -------- */
  ipcMain.handle('native-window:focus',   (_e, { id }) => focusWindowById(id));
  ipcMain.handle('native-window:close',   (_e, { id }) => closeWindowById(id));
  ipcMain.handle('native-window:minimize',(_e, { id }) => minimizeWindowById(id));
  ipcMain.handle('native-window:maximize',(_e, { id, maximized }) =>
    maximizeWindowById(id, maximized));

  ipcMain.handle('native-window:get-bounds', async (_e, { id }) => {
    try {
      const t = resolveTarget(id);
      if (!t || t.xid == null) return null;
      if (t.kind === 'our') {
        const w = getWindowById(t.appId);
        if (w) { const b = w.getBounds(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }
      }
      if (!watcher || !watcher.X) return null;
      return await getGeometry(watcher.X, t.xid, watcher.root);
    } catch {
      return null;
    }
  });

  /* -------- KRunner / Systemsettings -------- */
  ipcMain.handle('shell:run-krunner', async () => {
    try { spawn('krunner', [], { detached: true, stdio: 'ignore' }).unref(); return { ok: true }; }
    catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('shell:systemsettings', async () => {
    try { spawn('systemsettings', [], { detached: true, stdio: 'ignore' }).unref(); return { ok: true }; }
    catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('shell:logout', async () => {
    try { exec('qdbus6 org.kde.LogoutPrompt /LogoutPrompt org.kde.LogoutPrompt.promptAll')}
    catch (err) { return { ok: false, error: err.message }; }
  });

  return watcher;
}