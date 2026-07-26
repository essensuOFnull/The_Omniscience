import { clampRect } from '../../clampRect';
import { getDesktop, updateDesktop } from '../helpers';

export const setViewport = (state, payload, helpers) => {
  const { desktopId, rect } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;

  const { left, top, right, bottom, width, height } = rect;
  const newViewport = {
    left,
    top,
    right,
    bottom,
    width,
    height,
    centerX: width / 2,
    centerY: height / 2,
  };

  let newWindows = { ...desktop.windows };
  for (const id in newWindows) {
    const win = newWindows[id];
    if (win.closing) continue;
    if (win.maximized) {
      newWindows[id] = {
        ...win,
        ghost: {
          centerX: newViewport.centerX,
          centerY: newViewport.centerY,
          width: newViewport.width,
          height: newViewport.height,
          scale: 1,
          opacity: 1,
        },
      };
    } else if (!win.minimized) {
      const clamped = clampRect(
        win.ghost.centerX,
        win.ghost.centerY,
        win.ghost.width,
        win.ghost.height,
        newViewport
      );
      newWindows[id] = {
        ...win,
        ghost: {
          ...win.ghost,
          centerX: clamped.cx,
          centerY: clamped.cy,
          width: clamped.w,
          height: clamped.h,
        },
      };
    }
  }

  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: {
        ...desktop,
        viewport: newViewport,
        windows: newWindows,
      },
    },
  };
};