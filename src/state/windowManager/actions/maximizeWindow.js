import { getDesktop, getWindow, updateDesktop, updateWindow } from '../helpers';

export const maximizeWindow = (state, payload, helpers) => {
  const { desktopId, windowId } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;
  const win = getWindow(desktop, windowId);
  if (!win || win.closing) return state;

  const { getNewZ } = helpers;
  const vp = desktop.viewport || { centerX: 400, centerY: 300, width: 800, height: 600 };

  const updatedDesktop = updateWindow(desktop, windowId, (w) => ({
    ...w,
    unmaximizeGhost: { ...w.ghost },
    ghost: {
      centerX: vp.centerX,
      centerY: vp.centerY,
      width: vp.width,
      height: vp.height,
      scale: 1,
      opacity: 1,
    },
    maximized: true,
    animationVariant: 'maximize',
    z: getNewZ(),
  }));

  return {
    ...state,
    desktops: { ...state.desktops, [desktopId]: updatedDesktop },
  };
};