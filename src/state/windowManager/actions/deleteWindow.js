import { getDesktop, deleteWindowFromDesktop } from '../helpers';

export const deleteWindow = (state, payload, helpers) => {
  const { desktopId, windowId } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;

  const updatedDesktop = deleteWindowFromDesktop(desktop, windowId);
  let focused = desktop.focusedWindowId;
  if (focused === windowId) focused = null;

  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: {
        ...updatedDesktop,
        focusedWindowId: focused,
      },
    },
  };
};