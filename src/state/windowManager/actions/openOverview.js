import { getDesktop, updateDesktop } from '../helpers';

export const openOverview = (state, payload, helpers) => {
  const { desktopId } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop || desktop.isOverviewOpened) return state;

  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: { ...desktop, isOverviewOpened: true },
    },
  };
};