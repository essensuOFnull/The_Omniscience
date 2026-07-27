export const switchDesktop = (state, payload, helpers) => {
  const { desktopId } = payload;
  // Переключаемся только на существующий десктоп
  if (!state.desktops[desktopId] || state.activeDesktopId === desktopId) return state;
  return {
    ...state,
    activeDesktopId: desktopId,
  };
};
