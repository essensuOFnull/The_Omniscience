import { clampRect } from '../../clampRect';
import { getDesktop, getWindow, updateDesktop, updateWindow } from '../helpers';

export const setWindowRect = (state, payload, helpers) => {
  const { desktopId, windowId, cx, cy, width, height } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;
  const win = getWindow(desktop, windowId);
  if (!win || win.closing) return state;

  const vp = desktop.viewport || { width: 800, height: 600 };
  const clamped = clampRect(cx, cy, width, height, vp);

  const updatedDesktop = updateWindow(desktop, windowId, (w) => ({
    ...w,
    ghost: {
      ...w.ghost,
      centerX: clamped.cx,
      centerY: clamped.cy,
      width: clamped.w,
      height: clamped.h,
    },
    animationVariant: 'setRect',
  }));

  return {
    ...state,
    desktops: { ...state.desktops, [desktopId]: updatedDesktop },
  };
};