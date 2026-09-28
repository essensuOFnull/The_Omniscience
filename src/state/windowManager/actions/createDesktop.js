import { initialDesktopState } from '../initialState';

export const createDesktop = (state, payload, helpers) => {
  const { desktopId } = payload;

  if (state.desktops[desktopId]) {
    return {
      ...state,
      activeDesktopId: desktopId,
    };
  }

  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: initialDesktopState(),
    },
    activeDesktopId: desktopId,
  };
};