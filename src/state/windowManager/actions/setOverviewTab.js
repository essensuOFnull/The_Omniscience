import { getDesktop, updateDesktop } from '../helpers';

export const setOverviewTab = (state, payload) => {
  const { desktopId, tab } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;
  if (tab === desktop.overviewTab) return state;

  return updateDesktop(state, desktopId, (d) => ({
    ...d,
    overviewTab: tab,
  }));
};