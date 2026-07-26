import { getDesktop, updateDesktop } from '../helpers';

export const setGridViewport = (state, payload, helpers) => {
  const { desktopId, rect } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;

  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: { ...desktop, gridViewport: rect },
    },
  };
};