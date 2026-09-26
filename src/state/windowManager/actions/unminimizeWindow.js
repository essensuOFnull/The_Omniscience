import { getDesktop, getWindow, updateDesktop, updateWindow } from '../helpers';

export const unminimizeWindow = (state, payload, helpers) => {
  const { desktopId, windowId } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;

  const win = getWindow(desktop, windowId);
  if (!win || win.closing || !win.minimized) return state;

  const restoreGhost = win.unminimizeGhost || win.initialGhost;
  if (!restoreGhost) return state;

  const ghost = { ...restoreGhost, scale: 0 };
  const { getNewZ } = helpers;

  const updatedDesktop = updateWindow(desktop, windowId, (w) => ({
    ...w,
    ghost,
    minimized: false,
    animationVariant: 'unminimize',
    z: getNewZ(),
  }));

  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: { ...updatedDesktop, focusedWindowId: windowId },
    },
  };
};