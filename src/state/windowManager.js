import { clampRect } from './clampRect';

let idCounter = 0;
let zCounter = 100;

export const resetCounters = () => {
  idCounter = 0;
  zCounter = 100;
};

export const getNewId = () => `win-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const getNewZ = () => ++zCounter;

const updateWindow = (state, windowId, updater) => {
  const win = state.windows[windowId];
  if (!win) return state;
  return {
    ...state,
    windows: {
      ...state.windows,
      [windowId]: updater(win),
    },
  };
};

// --- Окна ---

export const createWindow = (state, payload, helpers) => {
  const [options] = payload;
  const { config, getNewId, getNewZ } = helpers;
  const { appId, cx, cy, width, height, url, extra } = options || {};
  const windowId = getNewId();
  const vp = state.viewport;
  const clamped = clampRect(cx || vp.centerX, cy || vp.centerY, width || 800, height || 600, vp);

  let newWindows = { ...state.windows };
  if (state.focusedWindowId) {
    const prev = newWindows[state.focusedWindowId];
    if (prev) {
      newWindows[state.focusedWindowId] = { ...prev, animationVariant: 'unfocus' };
    }
  }

  newWindows[windowId] = {
    appId,
    id: windowId,
    ghost: { centerX: clamped.cx, centerY: clamped.cy, width: clamped.w, height: clamped.h },
    minimized: false,
    maximized: false,
    closing: false,
    url: url || (appId === 'browser' ? config.homepageUrl || 'about:blank' : null),
    z: getNewZ(),
    contentScale: 1,
    animationVariant: 'create',
    completedAnimation: null,
    ...extra,
  };

  return {
    ...state,
    windows: newWindows,
    focusedWindowId: windowId,
  };
};

export const closeWindow = (state, payload, helpers) => {
  const [windowId] = payload;
  const win = state.windows[windowId];
  if (!win || win.closing) return state;
  return updateWindow(state, windowId, (w) => ({ ...w, closing: true, animationVariant: 'closing' }));
};

export const deleteWindow = (state, payload, helpers) => {
  const [windowId] = payload;
  const newWindows = { ...state.windows };
  delete newWindows[windowId];
  let focused = state.focusedWindowId;
  if (focused === windowId) focused = null;
  return { ...state, windows: newWindows, focusedWindowId: focused };
};

export const animationComplete = (state, windowId) => {
  const win = state.windows[windowId];
  if (!win) return state;
  if (win.closing) {
    return deleteWindow(state, windowId);
  }
  return updateWindow(state, windowId, (w) => ({
    ...w,
    completedAnimation: w.animationVariant,
  }));
};

export const focusWindow = (state, payload, helpers) => {
  const [windowId] = payload;
  const { getNewZ } = helpers;
  if (windowId === state.focusedWindowId) return state;
  let newWindows = { ...state.windows };
  if (state.focusedWindowId) {
    const prev = newWindows[state.focusedWindowId];
    if (prev) newWindows[state.focusedWindowId] = { ...prev, animationVariant: 'unfocus' };
  }
  if (windowId === null) {
    return { ...state, windows: newWindows, focusedWindowId: null };
  }
  const win = newWindows[windowId];
  if (!win || win.closing) return state;
  newWindows[windowId] = { ...win, z: getNewZ(), animationVariant: 'focus' };
  return { ...state, windows: newWindows, focusedWindowId: windowId };
};

export const minimizeWindow = (state, payload, helpers) => {
  const [windowId, cx, cy] = payload;
  const { getNewZ } = helpers;
  const win = state.windows[windowId];
  if (!win || win.closing || win.minimized) return state;
  const vp = state.viewport;
  const targetCX = cx ?? vp.centerX;
  const targetCY = cy ?? vp.height;
  const currentGhost = { ...win.ghost, scale: 1 };
  const newGhost = { ...currentGhost, centerX: targetCX, centerY: targetCY, scale: 0 };

  const newState = updateWindow(state, windowId, (w) => ({
    ...w,
    unminimizeGhost: currentGhost,
    ghost: newGhost,
    minimized: true,
    animationVariant: 'minimize',
    z: getNewZ(),
  }));
  return { ...newState, focusedWindowId: null };
};

export const unminimizeWindow = (state, payload, helpers) => {
  const [windowId] = payload;
  const { config, getNewZ } = helpers;
  const win = state.windows[windowId];
  if (!win || win.closing || !win.minimized) return state;
  const restoreGhost = win.unminimizeGhost || win.initialGhost;
  if (!restoreGhost) return state;
  const ghost = { ...restoreGhost, scale: 0 };

  let newState = updateWindow(state, windowId, (w) => ({
    ...w,
    ghost,
    minimized: false,
    animationVariant: 'unminimize',
    z: getNewZ(),
  }));
  newState = { ...newState, focusedWindowId: windowId };

  if (newState.isOverviewOpened && newState.overviewTab === 1) {
    // TODO: recalcOverviewGrid
  }
  return newState;
};

export const maximizeWindow = (state, payload, helpers) => {
  const [windowId] = payload;
  const { getNewZ } = helpers;
  const win = state.windows[windowId];
  if (!win || win.closing) return state;
  const vp = state.viewport;
  return updateWindow(state, windowId, (w) => ({
    ...w,
    unmaximizeGhost: { ...w.ghost },
    ghost: { centerX: vp.centerX, centerY: vp.centerY, width: vp.width, height: vp.height, scale: 1, opacity: 1 },
    maximized: true,
    animationVariant: 'maximize',
    z: getNewZ(),
  }));
};

export const unmaximizeWindow = (state, payload, helpers) => {
  const [windowId] = payload;
  const { getNewZ } = helpers;
  const win = state.windows[windowId];
  if (!win || win.closing) return state;
  return updateWindow(state, windowId, (w) => ({
    ...w,
    ghost: { ...w.unmaximizeGhost },
    maximized: false,
    animationVariant: 'unmaximize',
    z: getNewZ(),
  }));
};

export const setWindowRect = (state, payload, helpers) => {
  const [windowId, cx, cy, width, height] = payload;
  const win = state.windows[windowId];
  if (!win || win.closing) return state;
  const vp = state.viewport;
  const clamped = clampRect(cx, cy, width, height, vp);
  return updateWindow(state, windowId, (w) => ({
    ...w,
    ghost: { ...w.ghost, centerX: clamped.cx, centerY: clamped.cy, width: clamped.w, height: clamped.h },
    animationVariant: 'setRect',
  }));
};

export const setViewport = (state, payload, helpers) => {
  const [rect] = payload;
  const { left, top, right, bottom, width, height } = rect;
  const newViewport = { left, top, right, bottom, width, height, centerX: width / 2, centerY: height / 2 };
  let newWindows = { ...state.windows };
  for (const id in newWindows) {
    const win = newWindows[id];
    if (win.closing) continue;
    if (win.maximized) {
      newWindows[id] = {
        ...win,
        ghost: { centerX: newViewport.centerX, centerY: newViewport.centerY, width: newViewport.width, height: newViewport.height, scale: 1, opacity: 1 },
      };
    } else if (!win.minimized) {
      const clamped = clampRect(win.ghost.centerX, win.ghost.centerY, win.ghost.width, win.ghost.height, newViewport);
      newWindows[id] = {
        ...win,
        ghost: { ...win.ghost, centerX: clamped.cx, centerY: clamped.cy, width: clamped.w, height: clamped.h },
      };
    }
  }
  return { ...state, viewport: newViewport, windows: newWindows };
};

// --- Overview ---

export const openOverview = (state, payload, helpers) => {
  if (state.isOverviewOpened) return state;
  return { ...state, isOverviewOpened: true };
};

export const closeOverview = (state, payload, helpers) => {
  if (!state.isOverviewOpened) return state;
  let newState = { ...state, isOverviewOpened: false, gridViewport: null, gridTotalHeight: 0 };
  if (state.overviewTab === 1) {
    const windows = { ...newState.windows };
    for (const id in windows) {
      const win = windows[id];
      if (!win.closing && !win.minimized && win.ungridGhost) {
        windows[id] = { ...win, ghost: { ...win.ungridGhost }, contentScale: 1, animationVariant: 'setContentScale' };
      }
    }
    newState.windows = windows;
  }
  return newState;
};

export const setOverviewTab = (state, payload, helpers) => {
  const [tab] = payload;
  if (tab === state.overviewTab) return state;
  let newState = { ...state, overviewTab: tab };
  if (tab === 1) {
    const windows = { ...newState.windows };
    for (const id in windows) {
      const win = windows[id];
      if (!win.closing && !win.minimized) windows[id] = { ...win, ungridGhost: { ...win.ghost } };
    }
    newState.windows = windows;
  } else if (state.overviewTab === 1) {
    const windows = { ...newState.windows };
    for (const id in windows) {
      const win = windows[id];
      if (!win.closing && !win.minimized && win.ungridGhost) {
        windows[id] = { ...win, ghost: { ...win.ungridGhost }, contentScale: 1, animationVariant: 'setContentScale' };
      }
    }
    newState.windows = windows;
    newState.gridViewport = null;
    newState.gridTotalHeight = 0;
  }
  return newState;
};

export const setGridViewport = (state, payload, helpers) => {
  const [rect] = payload;
  return { ...state, gridViewport: rect };
};

export const setOverviewScrollTop = (state, payload, helpers) => {
  const [scrollTop] = payload;
  if (state.overviewScrollTop === scrollTop) return state;
  return { ...state, overviewScrollTop: scrollTop };
};

export const recalcOverviewGrid = (state, payload, helpers) => {
  // заглушка
  return state;
};

// Экспорт объекта для использования в Main.jsx
const windowManager = {
  createWindow,
  closeWindow,
  deleteWindow,
  animationComplete,
  focusWindow,
  minimizeWindow,
  unminimizeWindow,
  maximizeWindow,
  unmaximizeWindow,
  setWindowRect,
  setViewport,
  openOverview,
  closeOverview,
  setOverviewTab,
  setGridViewport,
  setOverviewScrollTop,
  recalcOverviewGrid,
  getNewId,
  getNewZ
};

export default windowManager;
export { windowManager };