import { getDesktop, getWindow, updateDesktop } from '../helpers';

export const createDevToolsWindow = (state, payload, helpers) => {
  const { desktopId, targetWindowId } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;

  const target = getWindow(desktop, targetWindowId);
  if (!target || target.closing) return state;

  // Если DevTools для этого окна уже открыт — фокусируем его
  for (const [wid, w] of Object.entries(desktop.windows)) {
    if (w.kind === 'devtools' && w.targetWindowId === targetWindowId && !w.closing) {
      return {
        ...state,
        desktops: {
          ...state.desktops,
          [desktopId]: { ...desktop, focusedWindowId: wid },
        },
      };
    }
  }

  const { getNewId, getNewZ } = helpers;

  const id = getNewId();
  const vp = desktop.viewport || { width: 1200, height: 800, centerX: 600, centerY: 400 };

  const width = Math.min(900, Math.round(vp.width * 0.7));
  const height = Math.min(650, Math.round(vp.height * 0.8));

  // Позиция — со сдвигом от целевого окна
  const cx = target.ghost.centerX + 40;
  const cy = target.ghost.centerY + 40;

  const ghost = { centerX: cx, centerY: cy, width, height, scale: 1, opacity: 1 };

  const newWin = {
    id,
    kind: 'devtools',
    targetWindowId,
    appId: null,
    url: null,
    ghost,
    initialGhost: { ...ghost },
    minimized: false,
    maximized: false,
    closing: false,
    snapped: null,
    z: getNewZ(),
    animationVariant: 'create',
  };

  const updatedDesktop = {
    ...desktop,
    windows: { ...desktop.windows, [id]: newWin },
    focusedWindowId: id,
  };

  return {
    ...state,
    desktops: { ...state.desktops, [desktopId]: updatedDesktop },
  };
};