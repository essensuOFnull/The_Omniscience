export const closeDesktop = (state, payload, helpers) => {
  const { desktopId } = payload;
  if (!state.desktops[desktopId]) return state;

  const newDesktops = { ...state.desktops };
  delete newDesktops[desktopId];

  // Если закрыли активный десктоп – активируем последний из оставшихся (или null)
  let activeDesktopId = state.activeDesktopId;
  if (activeDesktopId === desktopId) {
    const rest = Object.keys(newDesktops);
    activeDesktopId = rest.length ? rest[rest.length - 1] : null;
  }

  return {
    ...state,
    desktops: newDesktops,
    activeDesktopId,
  };
};
