import { getDesktop, getWindow, updateDesktop, updateWindow } from '../helpers';

export const minimizeWindow = (state, payload, helpers) => {
  const { desktopId, windowId, cx, cy } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;
  const win = getWindow(desktop, windowId);
  if (!win || win.closing || win.minimized) return state;

  const { getNewZ } = helpers;
  const vp = desktop.viewport || { centerX: 400, centerY: 300, height: 600 };
  const targetCX = cx ?? vp.centerX;
  const targetCY = cy ?? vp.height;
  const currentGhost = { ...win.ghost, scale: 1 };
  const newGhost = { ...currentGhost, centerX: targetCX, centerY: targetCY, scale: 0 };

  const updatedDesktop = updateWindow(desktop, windowId, (w) => ({
    ...w,
    unminimizeGhost: currentGhost,
    ghost: newGhost,
    minimized: true,
    animationVariant: 'minimize',
    z: getNewZ(),
  }));

  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: { ...updatedDesktop, focusedWindowId: null },
    },
  };
};