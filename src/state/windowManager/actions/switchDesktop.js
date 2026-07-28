export const switchDesktop = (state, payload, helpers) => {
  const { desktopId } = payload;
  // Переключаемся только на существующий десктоп
  if (!state.desktops[desktopId] || state.activeDesktopId === desktopId) return state;

  const previousDesktopId = state.activeDesktopId;
  const nextDesktop = state.desktops[desktopId];
  const previousDesktop = previousDesktopId ? state.desktops[previousDesktopId] : null;

  const updatedDesktops = { ...state.desktops };

  if (previousDesktop) {
    const updatedWindows = {};
    for (const [windowId, win] of Object.entries(previousDesktop.windows || {})) {
      if (!win || win.closing) {
        updatedWindows[windowId] = win;
        continue;
      }
      updatedWindows[windowId] = {
        ...win,
        savedGhost: { ...win.ghost },
      };
    }
    updatedDesktops[previousDesktopId] = {
      ...previousDesktop,
      windows: updatedWindows,
      focusedWindowId: null,
    };
  }

  if (nextDesktop) {
    const updatedWindows = {};
    for (const [windowId, win] of Object.entries(nextDesktop.windows || {})) {
      if (!win || win.closing) {
        updatedWindows[windowId] = win;
        continue;
      }
      if (win.savedGhost) {
        updatedWindows[windowId] = {
          ...win,
          ghost: { ...win.savedGhost },
          savedGhost: undefined,
        };
      } else {
        updatedWindows[windowId] = win;
      }
    }
    updatedDesktops[desktopId] = {
      ...nextDesktop,
      windows: updatedWindows,
    };
  }

  return {
    ...state,
    activeDesktopId: desktopId,
    desktops: updatedDesktops,
  };
};
