import { getDesktop, updateDesktop } from '../helpers';

export const closeOverview = (state, payload) => {
  const { desktopId } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop || !desktop.isOverviewOpened) return state;

  return updateDesktop(state, desktopId, (d) => ({
    ...d,
    isOverviewOpened: false,
  }));
};