// Простой генератор уникальных идентификаторов окон
let nextWindowId = 1;

/**
 * Генерирует новый уникальный идентификатор для окна.
 * @returns {number} Новый ID окна
 */
export function getNewId() {
  return nextWindowId++;
}

/**
 * Вычисляет новый z-индекс для окна, чтобы оно было поверх всех остальных.
 * @param {Object} windows - Объект со всеми окнами текущего рабочего стола
 * @returns {number} Новый z-индекс (максимальный + 1)
 */
export function getNewZ(windows) {
  const maxZ = Object.values(windows).reduce((max, win) => Math.max(max, win.z || 0), 0);
  return maxZ + 1;
}

/**
 * Сбрасывает счётчик ID (полезно при перезагрузке приложения).
 */
export function resetWindowIdCounter() {
  nextWindowId = 1;
}

// Дополнительные вспомогательные функции при необходимости
// Например, центрирование окна, проверка пересечений и т.д.