const initialState = () => ({
  windows: {},
  focusedWindowId: null,
  isOverviewOpened: false,
  overviewTab: 'apps-list',
  viewport: null,
  desktops: {},
  activeDesktopId: null,
});

export default initialState;
export { initialState };