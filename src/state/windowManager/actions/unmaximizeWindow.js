import { getDesktop, getWindow, updateWindow } from '../helpers';

export const unmaximizeWindow = (state, payload, helpers) => {
  const { desktopId, windowId } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;
  const win = getWindow(desktop, windowId);
  if (!win || win.closing) return state;
  if (!win.maximized) return state;                   // 👈 уже не максимизировано — выходим
  if (!win.unmaximizeGhost) return state;             // 👈 нет слепка — нечего восстанавливать

  const { getNewZ } = helpers;
  const updatedDesktop = updateWindow(desktop, windowId, (w) => ({
    ...w,
    ghost: { ...w.unmaximizeGhost },
    maximized: false,
    animationVariant: 'unmaximize',
    z: getNewZ(),
  }));

  return {
    ...state,
    desktops: { ...state.desktops, [desktopId]: updatedDesktop },
  };
};