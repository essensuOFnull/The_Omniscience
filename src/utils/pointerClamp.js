/**
 * Утилиты для pointer lock drag/resize с клампом внутри viewport.
 *
 * Главная идея: когда объект упирается в край, аккумулятор дельты
 * обрезается до реально применённой величины. Это устраняет "мёртвую зону",
 * когда пользователь тащит за край, аккумулятор растёт, а потом нужно
 * смотать весь перебор, чтобы объект сдвинулся в обратную сторону.
 */

/**
 * Границы центра для прямоугольника w×h внутри viewport.
 * Если объект больше viewport по какой-то оси — фиксируем центр посередине.
 */
export function getCenterBounds(w, h, vp) {
  const vw = vp.width;
  const vh = vp.height;

  let minCX, maxCX, minCY, maxCY;
  if (w >= vw) { minCX = maxCX = vw / 2; }
  else         { minCX = w / 2; maxCX = vw - w / 2; }

  if (h >= vh) { minCY = maxCY = vh / 2; }
  else         { minCY = h / 2; maxCY = vh - h / 2; }

  return { minCX, maxCX, minCY, maxCY };
}

/**
 * Клампит желаемую позицию центра внутри viewport.
 */
export function clampCenter(desiredCX, desiredCY, w, h, vp) {
  const b = getCenterBounds(w, h, vp);
  return {
    cx: Math.max(b.minCX, Math.min(b.maxCX, desiredCX)),
    cy: Math.max(b.minCY, Math.min(b.maxCY, desiredCY)),
  };
}

/**
 * Применяет дельту к drag-аккумулятору, клампит, обрезает аккумулятор.
 * Мутирует drag.accX, drag.accY.
 *
 * @param drag    { startCX, startCY, width, height, accX, accY }
 * @param dx, dy  дельты в пикселях
 * @param vp      viewport { width, height }
 * @returns       { cx, cy } — новая позиция центра
 */
export function dragBy(drag, dx, dy, vp) {
  drag.accX += dx;
  drag.accY += dy;

  const desiredCX = drag.startCX + drag.accX;
  const desiredCY = drag.startCY + drag.accY;

  const { cx, cy } = clampCenter(desiredCX, desiredCY, drag.width, drag.height, vp);

  // Ключевая строка: обрезаем аккумулятор под реально применённую дельту
  drag.accX = cx - drag.startCX;
  drag.accY = cy - drag.startCY;

  return { cx, cy };
}

/**
 * Ресайз прямоугольника с клампом внутри viewport.
 * Мутирует resize.accX, resize.accY.
 *
 * @param resize     { startCX, startCY, startW, startH, direction, accX, accY }
 * @param dx, dy     дельты
 * @param vp         viewport { width, height }
 * @param minW,minH  минимальные размеры (по умолчанию 1)
 * @returns          { cx, cy, w, h }
 */
export function resizeBy(resize, dx, dy, vp, minW = 1, minH = 1) {
  resize.accX += dx;
  resize.accY += dy;

  const d = resize.direction;
  const left   = resize.startCX - resize.startW / 2;
  const right  = resize.startCX + resize.startW / 2;
  const top    = resize.startCY - resize.startH / 2;
  const bottom = resize.startCY + resize.startH / 2;

  let newW = resize.startW, newH = resize.startH;
  let newCX = resize.startCX, newCY = resize.startCY;

  if (d.includes('e')) {
    newW = Math.max(minW, Math.min(resize.startW + resize.accX, vp.width - left));
    newCX = left + newW / 2;
  } else if (d.includes('w')) {
    newW = Math.max(minW, Math.min(resize.startW - resize.accX, right));
    newCX = right - newW / 2;
  }

  if (d.includes('s')) {
    newH = Math.max(minH, Math.min(resize.startH + resize.accY, vp.height - top));
    newCY = top + newH / 2;
  } else if (d.includes('n')) {
    newH = Math.max(minH, Math.min(resize.startH - resize.accY, bottom));
    newCY = bottom - newH / 2;
  }

  // Обрезаем аккумулятор до реально применённой величины
  if (d.includes('e'))      resize.accX = newW - resize.startW;
  else if (d.includes('w')) resize.accX = resize.startW - newW;
  if (d.includes('s'))      resize.accY = newH - resize.startH;
  else if (d.includes('n')) resize.accY = resize.startH - newH;

  return { cx: newCX, cy: newCY, w: newW, h: newH };
}