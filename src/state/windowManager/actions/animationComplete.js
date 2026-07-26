import { getDesktop, getWindow, updateDesktop, updateWindow } from '../helpers';
import { deleteWindow } from './deleteWindow';

export const animationComplete = (state, payload, helpers) => {
  const { desktopId, windowId } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;
  const win = getWindow(desktop, windowId);
  if (!win) return state;

  if (win.closing) {
    // Удаляем окно после анимации закрытия
    return deleteWindow(state, { desktopId, windowId });
  }

  const updatedDesktop = updateWindow(desktop, windowId, (w) => ({
    ...w,
    completedAnimation: w.animationVariant,
  }));

  return {
    ...state,
    desktops: { ...state.desktops, [desktopId]: updatedDesktop },
  };
};