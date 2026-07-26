// windowManager.js
import { initialState as baseInitialState } from './initialState';

// Начальное состояние для одного рабочего стола
const getDefaultDesktopState = () => ({
  windows: {},
  isOverviewOpened: false,
  overviewTab: 0,
  gridTotalHeight: 0,
  overviewScrollTop: 0,
  viewport: null,
  gridViewport: null,
});

export const windowManager = {
  // Действия, которые принимают desktopId в payload
  createWindow(state, payload, { config, getNewId, getNewZ }) {
    const { desktopId, appId, cx, cy, width, height, url, extra } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    const id = getNewId();
    const z = getNewZ(desktop.windows);
    const newWindow = {
      id,
      appId,
      x: cx - width / 2,
      y: cy - height / 2,
      width,
      height,
      z,
      minimized: false,
      url: url || null,
      extra: extra || {},
      title: extra?.app?.title || 'Окно',
    };
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          windows: { ...desktop.windows, [id]: newWindow },
        },
      },
    };
  },

  closeWindow(state, payload) {
    const { desktopId, windowId } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    const newWindows = { ...desktop.windows };
    delete newWindows[windowId];
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          windows: newWindows,
        },
      },
    };
  },

  focusWindow(state, payload) {
    const { desktopId, windowId } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    if (windowId === null) {
      // Снять фокус со всех окон
      return state;
    }
    const win = desktop.windows[windowId];
    if (!win) return state;
    const maxZ = Math.max(0, ...Object.values(desktop.windows).map(w => w.z || 0)) + 1;
    const updatedWindows = {
      ...desktop.windows,
      [windowId]: { ...win, z: maxZ, minimized: false },
    };
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          windows: updatedWindows,
        },
      },
    };
  },

  minimizeWindow(state, payload) {
    const { desktopId, windowId } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    const win = desktop.windows[windowId];
    if (!win) return state;
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          windows: {
            ...desktop.windows,
            [windowId]: { ...win, minimized: !win.minimized },
          },
        },
      },
    };
  },

  moveWindow(state, payload) {
    const { desktopId, windowId, x, y } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    const win = desktop.windows[windowId];
    if (!win) return state;
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          windows: {
            ...desktop.windows,
            [windowId]: { ...win, x, y },
          },
        },
      },
    };
  },

  resizeWindow(state, payload) {
    const { desktopId, windowId, width, height } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    const win = desktop.windows[windowId];
    if (!win) return state;
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          windows: {
            ...desktop.windows,
            [windowId]: { ...win, width, height },
          },
        },
      },
    };
  },

  openOverview(state, payload) {
    const { desktopId } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          isOverviewOpened: true,
        },
      },
    };
  },

  closeOverview(state, payload) {
    const { desktopId } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          isOverviewOpened: false,
        },
      },
    };
  },

  setOverviewTab(state, payload) {
    const { desktopId, tab } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          overviewTab: tab,
        },
      },
    };
  },

  setGridViewport(state, payload) {
    const { desktopId, rect } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          gridViewport: rect,
        },
      },
    };
  },

  setOverviewScrollTop(state, payload) {
    const { desktopId, scrollTop } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          overviewScrollTop: scrollTop,
        },
      },
    };
  },

  recalcOverviewGrid(state, payload) {
    // Заглушка – можно вычислить высоту сетки
    return state;
  },

  setViewport(state, payload) {
    const { desktopId, rect } = payload;
    const desktop = state.desktops[desktopId];
    if (!desktop) return state;
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: {
          ...desktop,
          viewport: rect,
        },
      },
    };
  },

  // Новые действия для управления десктопами
  createDesktop(state, payload) {
    const { desktopId } = payload;
    if (state.desktops[desktopId]) return state; // уже есть
    return {
      ...state,
      desktops: {
        ...state.desktops,
        [desktopId]: getDefaultDesktopState(),
      },
      activeDesktopId: desktopId,
    };
  },

  closeDesktop(state, payload) {
    const { desktopId } = payload;
    const newDesktops = { ...state.desktops };
    delete newDesktops[desktopId];
    // Если удаляем активный, переключаем на другой
    let newActive = state.activeDesktopId;
    if (state.activeDesktopId === desktopId) {
      const keys = Object.keys(newDesktops);
      newActive = keys.length > 0 ? keys[0] : null;
    }
    return {
      ...state,
      desktops: newDesktops,
      activeDesktopId: newActive,
    };
  },

  switchDesktop(state, payload) {
    const { desktopId } = payload;
    if (!state.desktops[desktopId]) return state;
    return {
      ...state,
      activeDesktopId: desktopId,
    };
  },
};

// Инициализация: в initialState будет пустой объект desktops
export const initialState = {
  desktops: {},
  activeDesktopId: null,
};