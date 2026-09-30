export const SNAP_THRESHOLD = 24;

/**
 * Определяет, какие стороны viewport'а задеты.
 * Возвращает строку из флагов через дефис, например: 'top-left', 'right', 'bottom-right'.
 * Порядок флагов не важен — getSnapGeometry парсит через includes.
 */
export function detectSnap(newCX, newCY, w, h, vp) {
  const left   = newCX - w / 2;
  const right  = newCX + w / 2;
  const top    = newCY - h / 2;
  const bottom = newCY + h / 2;

  const nearLeft   = left   <= SNAP_THRESHOLD;
  const nearRight  = right  >= vp.width - SNAP_THRESHOLD;
  const nearTop    = top    <= SNAP_THRESHOLD;
  const nearBottom = bottom >= vp.height - SNAP_THRESHOLD;

  if (!nearLeft && !nearRight && !nearTop && !nearBottom) return null;

  const parts = [];
  if (nearLeft)   parts.push('left');
  if (nearRight)  parts.push('right');
  if (nearTop)    parts.push('top');
  if (nearBottom) parts.push('bottom');
  return parts.join('-');
}

/**
 * Вычисляет геометрию для снапа.
 * Не зависит от порядка слов в строке — парсит через includes.
 * Поддерживает:
 *   - края:   'left', 'right', 'top', 'bottom'
 *   - углы:   'top-left', 'left-top', 'top-right', 'right-top', ...
 *   - двойные стороны: 'left-right', 'top-bottom' (растянуть на всю ось)
 */
export function getSnapGeometry(snap, vp) {
  if (!snap) return null;

  const { width, height } = vp;
  const halfW = width / 2;
  const halfH = height / 2;

  const hasLeft   = snap.includes('left');
  const hasRight  = snap.includes('right');
  const hasTop    = snap.includes('top');
  const hasBottom = snap.includes('bottom');

  let cx = width / 2;
  let cy = height / 2;
  let w  = width;
  let h  = height;

  if (hasLeft && hasRight) {
    cx = width / 2;
    w  = width;
  } else if (hasLeft) {
    cx = width / 4;
    w  = halfW;
  } else if (hasRight) {
    cx = halfW + width / 4;
    w  = halfW;
  }

  if (hasTop && hasBottom) {
    cy = height / 2;
    h  = height;
  } else if (hasTop) {
    cy = height / 4;
    h  = halfH;
  } else if (hasBottom) {
    cy = halfH + height / 4;
    h  = halfH;
  }

  return { centerX: cx, centerY: cy, width: w, height: h };
}