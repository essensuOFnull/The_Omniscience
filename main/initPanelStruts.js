import electronPkg from 'electron';
const { screen } = electronPkg;
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

let applied = false;
let applyTimer = null;

/* ------------------------------------------------------------------ */
/* XID                                                                 */
/* ------------------------------------------------------------------ */

function getXidHex(win) {
  try {
    const buf = win.getNativeWindowHandle();
    if (!buf || buf.length < 4) return null;
    return '0x' + (buf.readUInt32LE(0) >>> 0).toString(16);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Расчёт struts под текущую геометрию TopBar'а                        */
/* ------------------------------------------------------------------ */

/**
 * Struts нужны только когда TopBar реально виден и занимает полосу у края.
 * Если TopBar скрыт/не создан/плавающий — резервируем 0.
 *
 * Формат _NET_WM_STRUT_PARTIAL (12 значений, CARDINAL32):
 *   left, right, top, bottom,
 *   left_start_y, left_end_y,
 *   right_start_y, right_end_y,
 *   top_start_x, top_end_x,
 *   bottom_start_x, bottom_end_x
 */
function computeStruts(tb) {
  const display = screen.getPrimaryDisplay();
  const scr = display.bounds;

  const b = tb.getBounds();

  // Панель должна быть горизонтальной и растянутой по ширине экрана,
  // иначе struts не имеет смысла.
  const horizontal = b.width > b.height;
  const spansWidth = b.width >= scr.width - 4;

  if (!horizontal || !spansWidth) {
    return {
      left: 0, right: 0, top: 0, bottom: 0,
      leftSY: 0, leftEY: 0, rightSY: 0, rightEY: 0,
      topSX: 0, topEX: 0, botSX: 0, botEX: 0
    };
  }

  const scrTop = scr.y;
  const scrBottom = scr.y + scr.height;

  const tbTop = b.y;
  const tbBottom = b.y + b.height;

  // Панель сверху?
  if (Math.abs(tbTop - scrTop) <= 4) {
    const top = Math.max(0, tbBottom - scrTop);
    return {
      left: 0, right: 0, top, bottom: 0,
      leftSY: 0, leftEY: 0,
      rightSY: 0, rightEY: 0,
      topSX: Math.max(0, b.x - scr.x),
      topEX: Math.max(0, (b.x + b.width) - scr.x),
      botSX: 0, botEX: 0,
    };
  }

  // Панель снизу?
  if (Math.abs(tbBottom - scrBottom) <= 4) {
    const bottom = Math.max(0, scrBottom - tbTop);
    return {
      left: 0, right: 0, top: 0, bottom,
      leftSY: 0, leftEY: 0,
      rightSY: 0, rightEY: 0,
      topSX: 0, topEX: 0,
      botSX: Math.max(0, b.x - scr.x),
      botEX: Math.max(0, (b.x + b.width) - scr.x),
    };
  }

  // Панель слева?
  if (Math.abs(b.x - scr.x) <= 4) {
    const left = Math.max(0, (b.x + b.width) - scr.x);
    return {
      left, right: 0, top: 0, bottom: 0,
      leftSY: Math.max(0, b.y - scr.y),
      leftEY: Math.max(0, (b.y + b.height) - scr.y),
      rightSY: 0, rightEY: 0,
      topSX: 0, topEX: 0,
      botSX: 0, botEX: 0,
    };
  }

  // Панель справа?
  const scrRight = scr.x + scr.width;
  const tbRight = b.x + b.width;
  if (Math.abs(tbRight - scrRight) <= 4) {
    const right = Math.max(0, scrRight - b.x);
    return {
      left: 0, right, top: 0, bottom: 0,
      leftSY: 0, leftEY: 0,
      rightSY: Math.max(0, b.y - scr.y),
      rightEY: Math.max(0, (b.y + b.height) - scr.y),
      topSX: 0, topEX: 0,
      botSX: 0, botEX: 0,
    };
  }

  // Панель не у края — ничего не резервируем.
  return {
    left: 0, right: 0, top: 0, bottom: 0,
    leftSY: 0, leftEY: 0, rightSY: 0, rightEY: 0,
    topSX: 0, topEX: 0, botSX: 0, botEX: 0
  };
}

function strutsToXpropArgs(s) {
  const partial = [
    s.left, s.right, s.top, s.bottom,
    s.leftSY, s.leftEY,
    s.rightSY, s.rightEY,
    s.topSX, s.topEX,
    s.botSX, s.botEX,
  ].join(', ');
  const legacy = [s.left, s.right, s.top, s.bottom].join(', ');
  return { partial, legacy };
}

/* ------------------------------------------------------------------ */
/* Установка                                                           */
/* ------------------------------------------------------------------ */

export async function applyPanelStruts() {
  const tb = global.topbarWindow;
  if (!tb || tb.isDestroyed()) {
    console.warn('[panelStruts] нет topbarWindow');
    return false;
  }
  const xid = getXidHex(tb);
  if (!xid) {
    console.warn('[panelStruts] нет XID у topbarWindow');
    return false;
  }

  const struts = computeStruts(tb);
  const { partial, legacy } = strutsToXpropArgs(struts);

  try {
    await execFileAsync('xprop', [
      '-id', xid,
      '-f', '_NET_WM_STRUT_PARTIAL', '32c',
      '-set', '_NET_WM_STRUT_PARTIAL', partial,
    ]);
    await execFileAsync('xprop', [
      '-id', xid,
      '-f', '_NET_WM_STRUT', '32c',
      '-set', '_NET_WM_STRUT', legacy,
    ]);
    applied = true;
    console.log('[panelStruts] set', xid, '→', partial);
    return true;
  } catch (e) {
    console.error('[panelStruts] xprop failed:',
      e?.message || e,
      e?.stderr?.toString?.() || '');
    return false;
  }
}

/**
 * Отложенная установка с дебаунсом.
 * Полезно вызывать из move/resize TopBar'а, чтобы не спамить xprop.
 */
export function scheduleApplyPanelStruts(delay = 60) {
  if (applyTimer) clearTimeout(applyTimer);
  applyTimer = setTimeout(() => {
    applyTimer = null;
    applyPanelStruts().catch(() => { });
  }, delay);
}

export default function ({ show = true } = {}) {
  const tb = global.topbarWindow;
  if (!tb || tb.isDestroyed()) {
    console.warn('[panelStruts] init: нет topbarWindow');
    return;
  }

  tb.once('ready-to-show', () => {
    // Уже наверняка применяем и показываем
    applyPanelStruts().finally(() => {
      tb.show();
    });
  });

  tb.on('move', () => scheduleApplyPanelStruts());
  tb.on('resize', () => scheduleApplyPanelStruts());
  tb.on('show', () => scheduleApplyPanelStruts(50));
  tb.on('hide', () => scheduleApplyPanelStruts(50));
}