import { getDesktop, getWindow, updateWindow } from '../helpers';

export const updateFrameState = (state, payload) => {
  const { desktopId, windowId, patch } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;
  const win = getWindow(desktop, windowId);
  if (!win || win.closing) return state;

  const updatedDesktop = updateWindow(desktop, windowId, (w) => ({
    ...w,
    frame: { ...(w.frame || {}), ...patch },
  }));

  return {
    ...state,
    desktops: { ...state.desktops, [desktopId]: updatedDesktop },
  };
};