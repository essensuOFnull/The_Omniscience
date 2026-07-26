import { initialState } from '../initialState';
import { getDesktop } from '../helpers';

export const createDesktop = (state, payload, helpers) => {
  const { desktopId } = payload;

  // Если десктоп уже существует – просто делаем его активным
  if (state.desktops[desktopId]) {
    return {
      ...state,
      activeDesktopId: desktopId,
    };
  }

  // Создаём новый десктоп с начальным состоянием
  return {
    ...state,
    desktops: {
      ...state.desktops,
      [desktopId]: initialState(),
    },
    activeDesktopId: desktopId,
  };
};