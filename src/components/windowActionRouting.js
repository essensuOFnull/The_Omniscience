export function isWebWindowLike(windowLike = {}) {
  if (windowLike?.kind === 'native') return false;
  return windowLike?.kind === 'our' || windowLike?.kind === 'devtools' || !windowLike?.kind;
}

export function getWindowActionChannel(windowLike, action) {
  if (!action) return 'native-window:close';
  if (isWebWindowLike(windowLike)) {
    return `window:${action}`;
  }
  return `native-window:${action}`;
}

export function getWindowBoundsChannel(windowLike) {
  return isWebWindowLike(windowLike) ? 'window:set-bounds' : 'native-window:set-bounds';
}
