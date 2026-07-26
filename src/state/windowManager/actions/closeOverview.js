import { getDesktop, updateDesktop } from '../helpers';

export const closeOverview = (state, payload, helpers) => {
  const { desktopId } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop || !desktop.isOverviewOpened) return state;

  let newDesktop = { ...desktop, isOverviewOpened: false, gridViewport: null, gridTotalHeight: 0 };

  // Если был открыт режим сетки (вкладка "Открытые окна") – восстанавливаем позиции окон
  if (desktop.overviewTab === 1) {
    const windows = { ...newDesktop.windows };
    for (const id in windows) {
      const win = windows[id];
      if (!win.closing && !win.minimized && win.ungridGhost) {
        windows[id] = {
          ...win,
          ghost: { ...win.ungridGhost },
          contentScale: 1,
          animationVariant: 'setContentScale',
        };
      }
    }
    newDesktop.windows = windows;
  }

  return {
    ...state,
    desktops: { ...state.desktops, [desktopId]: newDesktop },
  };
};