import electronPkg from 'electron';
const { ipcMain } = electronPkg;
import { spawn } from 'child_process';
import { access, readFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';
import { getWindowById, getXidForWindow } from './ipc_windowManager.js';

/* ------------------------------------------------------------------ */
/* Debug                                                               */
/* ------------------------------------------------------------------ */

const DEBUG = process.env.OMNI_NATIVE_DEBUG !== '0';
function dbg(...args) { if (DEBUG) console.log('[nativeWindows]', ...args); }
function dbgWarn(...args) { if (DEBUG) console.warn('[nativeWindows]', ...args); }

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
  'WM_NAME',
  'WM_CLASS',
  'WM_PROTOCOLS',
  'WM_DELETE_WINDOW',
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
      X.InternAtom(false, name, (err, atom) => {
        atoms[name] = err ? 0 : atom;
        if (--pending === 0) resolve(atoms);
      });
    }
  });
}

function getProperty(X, win, atom, typeAtom = 0) {
  return new Promise((resolve) => {
    if (!atom) return resolve(null);
    X.GetProperty(0, win, atom, typeAtom, 0, 0x1fffffff, (err, prop) => {
      if (err || !prop || !prop.data || prop.data.length === 0) return resolve(null);
      resolve(prop);
    });
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

function parseWmState(atoms, atomMap) {
  return {
    minimized: atoms.includes(atomMap._NET_WM_STATE_HIDDEN),
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

/* ------------------------------------------------------------------ */
/* ГЕОМЕТРИЯ — ключевая функция, защищена от undefined                 */
/* ------------------------------------------------------------------ */

function getGeometry(X, win, root) {
  return new Promise((resolve) => {
    try {
      X.GetGeometry(win, (err, geo) => {
        if (err || !geo) return resolve(null);

        const width = num(geo.width, 0);
        const height = num(geo.height, 0);
        const localX = num(geo.x, 0);
        const localY = num(geo.y, 0);

        try {
          X.TranslateCoordinates(win, root, 0, 0, (err2, tc) => {
            if (err2 || !tc) {
              return resolve({ x: localX, y: localY, width, height });
            }
            // Разные версии x11-пакета используют разные имена полей.
            const dstX = tc.dstX ?? tc.destX ?? tc.dst_x ?? tc.x;
            const dstY = tc.dstY ?? tc.destY ?? tc.dst_y ?? tc.y;

            const x = num(dstX, NaN);
            const y = num(dstY, NaN);

            if (Number.isFinite(x) && Number.isFinite(y)) {
              resolve({ x, y, width, height });
            } else {
              // TranslateCoordinates вернул мусор — берём локальные.
              resolve({ x: localX, y: localY, width, height });
            }
          });
        } catch {
          resolve({ x: localX, y: localY, width, height });
        }
      });
    } catch {
      resolve(null);
    }
  });
}

function getActiveXidRaw(X, root, atom) {
  return new Promise((resolve) => {
    if (!atom) return resolve(null);
    X.GetProperty(0, root, atom, 0, 0, 4, (err, prop) => {
      if (err || !prop || !prop.data || prop.data.length < 4) return resolve(null);
      const win = readU32At(prop.data, 0) >>> 0;
      resolve(win ? win : null);
    });
  });
}

function getInputFocus(X) {
  return new Promise((resolve) => {
    X.GetInputFocus((err, focus) => {
      if (err || !focus) return resolve(null);
      const xid = (focus.focus >>> 0);
      if (!xid || xid === 1) return resolve(null);
      resolve(xid);
    });
  });
}

function queryTree(X, win) {
  return new Promise((resolve) => {
    X.QueryTree(win, (err, tree) => {
      if (err || !tree) return resolve(null);
      resolve(tree);
    });
  });
}

function warpPointer(X, root, x, y) {
  return new Promise((resolve) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      dbgWarn('warpPointer: невалидные координаты', x, y);
      return resolve(false);
    }
    try {
      X.WarpPointer(root, 0, 0, 0, 0, 0,
        Math.max(0, Math.round(x)), Math.max(0, Math.round(y)),
        (err) => resolve(!err));
    } catch { resolve(false); }
  });
}

/* ------------------------------------------------------------------ */
/* Fresh timestamp                                                     */
/* ------------------------------------------------------------------ */

const TS_PROP_NAME = `_OMNI_TS_${process.pid}`;
let tsAtom = 0;

function ensureTsAtom(X) {
  return new Promise((resolve) => {
    if (tsAtom) return resolve(tsAtom);
    X.InternAtom(false, TS_PROP_NAME, (err, atom) => {
      if (err || !atom) return resolve(0);
      tsAtom = atom;
      resolve(atom);
    });
  });
}

function getFreshTimestamp(X, root, atomMap) {
  return new Promise((resolve) => {
    ensureTsAtom(X).then((atom) => {
      if (!atom) return resolve(0);
      let done = false;
      const onEvent = (ev) => {
        if (ev.name === 'PropertyNotify' && ev.window === root && ev.atom === atom) {
          done = true;
          X.removeListener('event', onEvent);
          resolve(ev.time >>> 0);
        }
      };
      X.on('event', onEvent);
      const data = Buffer.from(String(Date.now()), 'utf8');
      X.ChangeProperty(0, root, atom, atomMap.STRING, 8, data, () => { /* ignore */ });
      setTimeout(() => {
        if (!done) {
          done = true;
          X.removeListener('event', onEvent);
          resolve(0);
        }
      }, 200);
    });
  });
}

/* ------------------------------------------------------------------ */
/* ClientMessage / управление                                          */
/* ------------------------------------------------------------------ */

function sendClientMessage(X, root, targetWin, messageType, data) {
  return new Promise((resolve) => {
    if (!messageType) return resolve(false);
    const event = {
      type: 33, format: 32, window: targetWin,
      message_type: messageType,
      data: data || [0, 0, 0, 0, 0],
    };
    try { X.SendEvent(root, false, SEND_EVENT_MASK, event, () => resolve(true)); }
    catch { resolve(false); }
  });
}

function activateWindowX11(X, root, atomMap, win, timestamp = 0) {
  return sendClientMessage(X, root, win, atomMap._NET_ACTIVE_WINDOW,
    [2, (timestamp >>> 0), 0, 0, 0]);
}

function setInputFocusDirect(X, win, timestamp = 0) {
  return new Promise((resolve) => {
    try { X.SetInputFocus(win, 1, (timestamp >>> 0), (err) => resolve(!err)); }
    catch { resolve(false); }
  });
}

function raiseWindowX11(X, win) {
  return new Promise((resolve) => {
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
    if (!wmProtocols || !wmDelete) return resolve(false);
    const event = {
      type: 33, format: 32, window: win,
      message_type: wmProtocols,
      data: [wmDelete, (timestamp >>> 0), 0, 0, 0],
    };
    try { X.SendEvent(win, false, 0, event, () => resolve(true)); }
    catch { resolve(false); }
  });
}

function setWmState(X, root, atomMap, win, action, a1, a2 = 0) {
  return sendClientMessage(X, root, win, atomMap._NET_WM_STATE, [action, a1, a2, 2, 0]);
}

function minimizeWindowX11(X, root, atomMap, win) {
  return setWmState(X, root, atomMap, win, 1, atomMap._NET_WM_STATE_HIDDEN);
}

function maximizeWindowX11(X, root, atomMap, win, maximized) {
  const action = maximized ? 0 : 1;
  return setWmState(X, root, atomMap, win, action,
    atomMap._NET_WM_STATE_MAXIMIZED_VERT,
    atomMap._NET_WM_STATE_MAXIMIZED_HORZ);
}

function moveResizeWindowX11(X, win, x, y, width, height) {
  return new Promise((resolve) => {
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
/* computeDragTarget — защищён от невалидных bounds                    */
/* ------------------------------------------------------------------ */

function computeDragTarget(mode, direction, b) {
  const x = num(b?.x, 0);
  const y = num(b?.y, 0);
  const w = num(b?.width, 0);
  const h = num(b?.height, 0);

  const xL = x;
  const xR = x + w;
  const xC = Math.round(x + w / 2);
  const yT = y;
  const yB = y + h;
  const yC = Math.round(y + h / 2);

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
  const [active, clients] = await Promise.all([
    spawnXprop(['-root', '-notype', '_NET_ACTIVE_WINDOW']),
    spawnXprop(['-root', '-notype', '_NET_CLIENT_LIST']),
  ]);
  console.log('[nativeWindows][selftest] _NET_ACTIVE_WINDOW:', active || '(empty)');
  console.log('[nativeWindows][selftest] _NET_CLIENT_LIST:', clients);
}

/* ------------------------------------------------------------------ */
/* Watcher                                                             */
/* ------------------------------------------------------------------ */

class X11Watcher {
  constructor({ onUpdate }) {
    this.onUpdate = onUpdate;
    this.windows = new Map();
    this.frameToClient = new Map();
    this.activeXid = null;

    this.X = null;
    this.root = null;
    this.atomMap = null;

    this.destroyed = false;

    this.refreshTimer = null;
    this.focusPollTimer = null;

    this.refreshing = false;
    this.pendingRefresh = false;
    this.lastHash = '';

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
      this.X.on('error', (e) =>
        console.error('[nativeWindows] X11 error:', e?.message || e));

      internAtoms(this.X, ATOM_NAMES).then((atomMap) => {
        if (this.destroyed) return;
        this.atomMap = atomMap;
        this.attachRoot();
        this.refreshAll();
        selfTestDump();

        this.focusPollTimer = setInterval(() => {
          if (this.destroyed) return;
          this.applyActiveXid();
        }, FOCUS_POLL_MS);
      });
    });
  }

  stop() {
    this.destroyed = true;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (this.focusPollTimer) clearInterval(this.focusPollTimer);
    this.refreshTimer = null;
    this.focusPollTimer = null;
    if (this.X) { try { this.X.terminate(); } catch { /* ignore */ } }
  }

  attachRoot() {
    const em = x11.eventMask;
    const mask = em.SubstructureNotify | em.PropertyChange;
    this.X.ChangeWindowAttributes(this.root, { eventMask: mask }, (err) => {
      if (err) console.error('[nativeWindows] ChangeWindowAttributes(root):', err.message || err);
    });
    this.X.on('event', (ev) => {
      try { this.handleEvent(ev); }
      catch (e) { console.error('[nativeWindows] event:', e?.message || e); }
    });
  }

  handleEvent(ev) {
    if (this.destroyed || !this.atomMap) return;
    const t = ev.name;

    if (t === 'PropertyNotify') {
      if (ev.window === this.root) {
        if (ev.atom === this.atomMap._NET_ACTIVE_WINDOW) this.applyActiveXid();
        if (ev.atom === this.atomMap._NET_CLIENT_LIST ||
            ev.atom === this.atomMap._NET_CLIENT_LIST_STACKING) this.scheduleRefresh();
        return;
      }
      const rec = this.windows.get(ev.window);
      if (!rec) return;
      if (ev.atom === this.atomMap._NET_WM_STATE) this.refreshWmState(ev.window);
      else if (ev.atom === this.atomMap._NET_WM_NAME ||
               ev.atom === this.atomMap.WM_NAME) this.refreshTitle(ev.window);
      return;
    }

    if (t === 'ConfigureNotify') {
      if (this.windows.has(ev.window)) this.refreshGeometry(ev.window);
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
      if (this.windows.has(ev.window)) this.refreshWmState(ev.window);
    }
  }

  scheduleRefresh() {
    if (this.destroyed || this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refreshAll();
    }, REFRESH_DEBOUNCE_MS);
  }

  resolveToClientXid(xid) {
    if (this.windows.has(xid)) return xid;
    const mapped = this.frameToClient.get(xid);
    if (mapped && this.windows.has(mapped)) return mapped;
    return null;
  }

  async readActiveXid() {
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
    return this.activeXid;
  }

  async applyActiveXid() {
    const next = await this.readActiveXid();
    if (next === this.activeXid) return;
    this.activeXid = next;
    this.emit();
  }

  async refreshAll() {
    if (this.destroyed || !this.X || !this.atomMap) return;
    if (this.refreshing) { this.pendingRefresh = true; return; }
    this.refreshing = true;
    try {
      const ids = await readClientList(this.X, this.root, this.atomMap._NET_CLIENT_LIST);
      const seen = new Set();

      for (const win of ids) {
        if (!win) continue;
        seen.add(win);
        let rec = this.windows.get(win);
        if (!rec) {
          const [wmClass, title, stateAtoms, pid, desk, geo] = await Promise.all([
            readWmClass(this.X, win, this.atomMap.WM_CLASS),
            readWindowTitle(this.X, win, this.atomMap),
            readWmStateAtoms(this.X, win, this.atomMap._NET_WM_STATE),
            readPid(this.X, win, this.atomMap._NET_WM_PID),
            readDesktop(this.X, win, this.atomMap._NET_WM_DESKTOP),
            getGeometry(this.X, win, this.root),
          ]);
          if (IGNORE_CLASS_PARTS.some((c) => wmClass.includes(c))) continue;

          const { minimized, maximized } = parseWmState(stateAtoms, this.atomMap);
          const icon = await resolveIconForWmClass(wmClass);

          rec = {
            id: xidToHex(win),
            xid: win,
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

          const tree = await queryTree(this.X, win);
          if (tree && tree.parent && tree.parent !== this.root) {
            this.frameToClient.set(tree.parent, win);
          }
        } else {
          const geo = await getGeometry(this.X, win, this.root);
          if (geo) {
            rec.x = num(geo.x, rec.x);
            rec.y = num(geo.y, rec.y);
            rec.width = num(geo.width, rec.width);
            rec.height = num(geo.height, rec.height);
          }
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
    } finally {
      this.refreshing = false;
      if (this.pendingRefresh) {
        this.pendingRefresh = false;
        this.scheduleRefresh();
      }
    }
  }

  subscribeToWindow(win) {
    if (!this.X) return;
    const em = x11.eventMask;
    try {
      this.X.ChangeWindowAttributes(win, {
        eventMask: em.StructureNotify | em.PropertyChange,
      });
    } catch { /* окно могло умереть */ }
  }

  async refreshWmState(win) {
    const rec = this.windows.get(win);
    if (!rec) return;
    const atoms = await readWmStateAtoms(this.X, win, this.atomMap._NET_WM_STATE);
    const { minimized, maximized } = parseWmState(atoms, this.atomMap);
    if (rec.isMinimized === minimized && rec.isMaximized === maximized) return;
    rec.isMinimized = minimized;
    rec.isMaximized = maximized;
    this.emit();
  }

  async refreshTitle(win) {
    const rec = this.windows.get(win);
    if (!rec) return;
    const title = await readWindowTitle(this.X, win, this.atomMap);
    if (rec.title === title) return;
    rec.title = title;
    this.emit();
  }

  async refreshGeometry(win) {
    const rec = this.windows.get(win);
    if (!rec) return;
    const geo = await getGeometry(this.X, win, this.root);
    if (!geo) return;
    const x = num(geo.x, rec.x);
    const y = num(geo.y, rec.y);
    const width = num(geo.width, rec.width);
    const height = num(geo.height, rec.height);
    if (rec.x === x && rec.y === y && rec.width === width && rec.height === height) return;
    rec.x = x; rec.y = y; rec.width = width; rec.height = height;
    this.emit();
  }

  emit(force = false) {
    const payload = [...this.windows.values()];
    const hash = payload
      .map((w) => `${w.id},${w.x},${w.y},${w.width},${w.height},${w.title},`
        + `${w.isMinimized ? 1 : 0},${w.isMaximized ? 1 : 0},${w.icon ? 1 : 0}`)
      .join(';') + '|' + (this.activeXid || '');
    if (!force && hash === this.lastHash) return;
    this.lastHash = hash;
    if (this.suppressEmit) return;
    this.onUpdate(payload, this.activeXid);
  }

  /* ---------------- управление ---------------- */

  async focus(win) {
    if (!this.X) return false;
    const ts = await getFreshTimestamp(this.X, this.root, this.atomMap);
    await activateWindowX11(this.X, this.root, this.atomMap, win, ts);
    await new Promise((r) => setTimeout(r, 120));
    let cur = await getInputFocus(this.X);
    let resolved = cur != null ? this.resolveToClientXid(cur) : null;
    if (resolved === win) { dbg('focus: EWMH ok'); return true; }
    dbg('focus: EWMH failed, XSetInputFocus');
    await raiseWindowX11(this.X, win);
    const ok = await setInputFocusDirect(this.X, win, ts);
    await new Promise((r) => setTimeout(r, 80));
    cur = await getInputFocus(this.X);
    resolved = cur != null ? this.resolveToClientXid(cur) : null;
    dbg('focus: XSetInputFocus →', ok, 'resolved =', resolved === win);
    return resolved === win;
  }

  async close(win) {
    if (!this.X) return false;
    const ts = await getFreshTimestamp(this.X, this.root, this.atomMap);
    dbg('close', xidToHex(win), 'ts =', ts);

    await closeWindowX11(this.X, this.root, this.atomMap, win, ts);
    await new Promise((r) => setTimeout(r, 200));
    if (!this.windows.has(win)) return true;

    dbg('close: WM_DELETE_WINDOW');
    await sendWmDeleteWindow(this.X, win, this.atomMap, ts);
    await new Promise((r) => setTimeout(r, 200));
    if (!this.windows.has(win)) return true;

    dbg('close: XKillClient (hard)');
    return new Promise((resolve) => {
      try { X.KillClient(win, (err) => resolve(!err)); }
      catch { resolve(false); }
    });
  }

  async minimize(win) {
    if (!this.X) return false;
    return minimizeWindowX11(this.X, this.root, this.atomMap, win);
  }

  async maximize(win, maximized) {
    if (!this.X) return false;
    return maximizeWindowX11(this.X, this.root, this.atomMap, win, maximized);
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
  const all = [...watcher.windows.values()];
  const filtered = all.filter((w) => {
    const x = String(w.id || '').toLowerCase();
    return x && !SHELL_XIDS.has(x);
  });
  return { windows: filtered, activeXid: watcher.activeXid };
}

export function isX11Available() { return !!(watcher && watcher.X); }

function resolveTarget(id) {
  if (id == null) return null;
  const our = getWindowById(id);
  if (our) {
    const xidHex = getXidForWindow(id);
    if (!xidHex) return { kind: 'our', xid: null, appId: id };
    return { kind: 'our', xid: parseXid(xidHex), appId: id };
  }
  const xid = parseXid(id);
  if (!xid) return null;
  return { kind: 'native', xid };
}

/* ---------- Публичные операции ---------- */

export async function focusWindowById(id) {
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
}

export async function closeWindowById(id) {
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
}

export async function minimizeWindowById(id) {
  const t = resolveTarget(id);
  if (!t) return { ok: false };
  if (t.kind === 'our') {
    const w = getWindowById(t.appId);
    if (w) w.minimize();
  }
  if (t.xid != null && watcher) {
    await watcher.minimize(t.xid);
    watcher.scheduleRefresh();
  }
  return { ok: true };
}

export async function maximizeWindowById(id, maximized) {
  const t = resolveTarget(id);
  if (!t) return { ok: false };
  if (t.kind === 'our') {
    const w = getWindowById(t.appId);
    if (w) { if (maximized) w.unmaximize(); else w.maximize(); }
  }
  if (t.xid != null && watcher) {
    await watcher.maximize(t.xid, maximized);
    watcher.scheduleRefresh();
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* export default                                                      */
/* ------------------------------------------------------------------ */

export default function () {
  if (initialized) return;
  initialized = true;

  registerShellWindow(global.topbarWindow, 'topbar');
  registerShellWindow(global.mainWindow, 'main');

  watcher = new X11Watcher({
    onUpdate: (windows, activeXid) => {
      global.__lastNativeWindows = windows;
      global.__activeXid = activeXid;
      global.topbarBroadcast?.();
      if (global.mainWindow && !global.mainWindow.isDestroyed()) {
        global.mainWindow.webContents.send('shell:native-windows-updated', windows);
      }
    },
  });
  watcher.start();

  /* -------- prepare-drag: свежая геометрия + WarpPointer -------- */
  ipcMain.handle('native-window:prepare-drag', async (_e, { id, mode, direction }) => {
    const t = resolveTarget(id);
    if (!t || !watcher || !watcher.X) return { ok: false };

    // Свои Electron-окна
    if (t.kind === 'our') {
      const w = getWindowById(t.appId);
      if (!w) return { ok: false };
      const b = w.getBounds();
      const bounds = {
        x: num(b.x), y: num(b.y),
        width: num(b.width), height: num(b.height),
      };

      const target = computeDragTarget(mode, direction, bounds);
      const warped = await warpPointer(watcher.X, watcher.root, target.x, target.y);
      dbg('prepare-drag (our)', id, mode, direction,
          '→ bounds', bounds, 'target', target, 'ok =', warped);

      return {
        ok: true, kind: 'our',
        cursor: target, bounds,
      };
    }

    // Нативное окно — читаем геометрию СВЕЖУЮ, не из кэша
    const bounds = await getGeometry(watcher.X, t.xid, watcher.root);
    if (!bounds) {
      dbgWarn('prepare-drag: getGeometry вернул null для', xidToHex(t.xid));
      return { ok: false };
    }

    const target = computeDragTarget(mode, direction, bounds);
    const warped = await warpPointer(watcher.X, watcher.root, target.x, target.y);

    dbg('prepare-drag', xidToHex(t.xid), mode, direction,
        '→ bounds', bounds, 'target', target, 'ok =', warped);

    return {
      ok: true, kind: 'native',
      cursor: target,
      bounds,
    };
  });

  /* -------- set-bounds (ручной drag) -------- */
  ipcMain.on('native-window:set-bounds', async (_e, { id, bounds }) => {
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
  });

  ipcMain.on('native-window:drag-end', () => {
    if (watcher) watcher.scheduleRefresh();
  });

  /* -------- прямые IPC-каналы -------- */
  ipcMain.handle('native-window:focus',   (_e, { id }) => focusWindowById(id));
  ipcMain.handle('native-window:close',   (_e, { id }) => closeWindowById(id));
  ipcMain.handle('native-window:minimize',(_e, { id }) => minimizeWindowById(id));
  ipcMain.handle('native-window:maximize',(_e, { id, maximized }) =>
    maximizeWindowById(id, maximized));

  ipcMain.handle('native-window:get-bounds', async (_e, { id }) => {
    const t = resolveTarget(id);
    if (!t || t.xid == null) return null;
    if (t.kind === 'our') {
      const w = getWindowById(t.appId);
      if (w) { const b = w.getBounds(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }
    }
    if (!watcher || !watcher.X) return null;
    return await getGeometry(watcher.X, t.xid, watcher.root);
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

  return watcher;
}