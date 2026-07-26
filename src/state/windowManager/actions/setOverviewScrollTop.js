import { getDesktop, updateDesktop } from '../helpers';

export const setOverviewScrollTop = (state, payload, helpers) => {
  const { desktopId, scrollTop } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop || desktop.overviewScrollTop === scrollTop) return state;

  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: { ...desktop, overviewScrollTop: scrollTop },
    },
  };
};