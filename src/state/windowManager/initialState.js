const initialState = () => ({
  windows: {},
  focusedWindowId: null,
  isOverviewOpened: false,
  overviewTab: 'apps-list',
  viewport: null,
  desktops: {},
  activeDesktopId: null,
});

export const initialDesktopState = () => ({
  windows: {},
  focusedWindowId: null,
  isOverviewOpened: false,
  overviewTab: 'apps-list',
  viewport: null,
});

export default initialState;
export { initialState };