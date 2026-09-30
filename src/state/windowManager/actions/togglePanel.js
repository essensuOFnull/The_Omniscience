import { getDesktop, getWindow, updateWindow } from '../helpers';

export const togglePanel = (state, payload) => {
  const { desktopId, windowId } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;
  const win = getWindow(desktop, windowId);
  if (!win || win.closing) return state;

  const updated = updateWindow(desktop, windowId, (w) => ({
    ...w,
    panelHidden: !w.panelHidden,
  }));

  return {
    ...state,
    desktops: { ...state.desktops, [desktopId]: updated },
  };
};