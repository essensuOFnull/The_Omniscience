import { getDesktop, updateDesktop } from '../helpers';

export const setOverviewTab = (state, payload, helpers) => {
  const { desktopId, tab } = payload;
  const desktop = getDesktop(state, desktopId);
  if (!desktop) return state;
  if (tab === desktop.overviewTab) return state;

  let newDesktop = { ...desktop, overviewTab: tab };

  if (tab === 1) {
    // Переход на вкладку "Открытые окна" – сохраняем текущие позиции окон
    const windows = { ...newDesktop.windows };
    for (const id in windows) {
      const win = windows[id];
      if (!win.closing && !win.minimized) {
        windows[id] = { ...win, ungridGhost: { ...win.ghost } };
      }
    }
    newDesktop.windows = windows;
  } else if (desktop.overviewTab === 1) {
    // Возврат с вкладки "Открытые окна" – восстанавливаем позиции
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
    newDesktop.gridViewport = null;
    newDesktop.gridTotalHeight = 0;
  }

  return {
    ...state,
    desktops: { ...state.desktops, [desktopId]: newDesktop },
  };
};