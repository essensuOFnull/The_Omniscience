import { getDesktop, getWindow, updateDesktop } from '../helpers';

export const focusWindow = (state, payload, helpers) => {
  const { desktopId, windowId } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;
  if (windowId === desktop.focusedWindowId) return state;

  const { getNewZ } = helpers;
  let newWindows = { ...desktop.windows };

  if (desktop.focusedWindowId) {
    const prev = newWindows[desktop.focusedWindowId];
    if (prev) newWindows[desktop.focusedWindowId] = { ...prev, animationVariant: 'unfocus' };
  }

  if (windowId === null) {
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: { ...desktop, windows: newWindows, focusedWindowId: null },
      },
    };
  }

  const win = newWindows[windowId];
  if (!win || win.closing) return state;
  newWindows[windowId] = { ...win, z: getNewZ(), animationVariant: 'focus' };

  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: { ...desktop, windows: newWindows, focusedWindowId: windowId },
    },
  };
};