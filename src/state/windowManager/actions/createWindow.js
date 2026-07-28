import { clampRect } from '../../clampRect';
import { getDesktop, getWindow, updateDesktop, updateWindow, deleteWindowFromDesktop } from '../helpers';

export const createWindow = (state, payload, helpers) => {
  const { desktopId, appId, cx, cy, width, height, url, extra } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;

  const { config, getNewId, getNewZ } = helpers;
  const windowId = getNewId();
  const vp = desktop.viewport || { width: 800, height: 600, centerX: 400, centerY: 300 };
  const clamped = clampRect(cx || vp.centerX, cy || vp.centerY, width || 800, height || 600, vp);

  let newWindows = { ...desktop.windows };
  if (desktop.focusedWindowId) {
    const prev = newWindows[desktop.focusedWindowId];
    if (prev) {
      newWindows[desktop.focusedWindowId] = { ...prev, animationVariant: 'unfocus' };
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
    preload: extra?.preload || null,
    z: getNewZ(),
    contentScale: 1,
    animationVariant: 'create',
    completedAnimation: null,
    ...extra,
  };

  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: {
        ...desktop,
        windows: newWindows,
        focusedWindowId: windowId,
      },
    },
  };
};