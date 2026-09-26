import { clampRect } from '../clampRect';

let idCounter = 0;
let zCounter = 100;

export const resetCounters = () => {
  idCounter = 0;
  zCounter = 100;
};

export const getNewId = () => `win-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const getNewZ = () => ++zCounter;

// ---- Работа с десктопами ----
export const getDesktop = (state, desktopId) => {
  const desktop = state.desktops?.[desktopId];
  if (!desktop) {
    console.warn(`[windowManager] Desktop "${desktopId}" not found`);
    return null;
  }
  return desktop;
};

export const updateDesktop = (state, desktopId, updater) => {
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;
  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: updater(desktop),
    },
  };
};

// ---- Работа с окнами внутри десктопа ----
export const getWindow = (desktop, windowId) => {
  return desktop.windows?.[windowId];
};

export const updateWindow = (desktop, windowId, updater) => {
  const win = getWindow(desktop, windowId);
  if (!win) return desktop;
  return {
    ...desktop,
    windows: {
      ...desktop.windows,
      [windowId]: updater(win),
    },
  };
};

export const deleteWindowFromDesktop = (desktop, windowId) => {
  const newWindows = { ...desktop.windows };
  delete newWindows[windowId];
  return {
    ...desktop,
    windows: newWindows,
  };
};

export { default as initialState } from './initialState';

export { createWindow } from './actions/createWindow';
export { closeWindow } from './actions/closeWindow';
export { deleteWindow } from './actions/deleteWindow';
export { animationComplete } from './actions/animationComplete';
export { focusWindow } from './actions/focusWindow';
export { minimizeWindow } from './actions/minimizeWindow';
export { unminimizeWindow } from './actions/unminimizeWindow';
export { maximizeWindow } from './actions/maximizeWindow';
export { unmaximizeWindow } from './actions/unmaximizeWindow';
export { setWindowRect } from './actions/setWindowRect';
export { setViewport } from './actions/setViewport';
export { openOverview } from './actions/openOverview';
export { closeOverview } from './actions/closeOverview';
export { setOverviewTab } from './actions/setOverviewTab';
export { createDesktop } from './actions/createDesktop';
export { switchDesktop } from './actions/switchDesktop';
export { closeDesktop } from './actions/closeDesktop';