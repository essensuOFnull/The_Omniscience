const initialState = () => ({
  windows: {},
  focusedWindowId: null,
  isOverviewOpened: false,
  overviewTab: 0,
  gridTotalHeight: 0,
  overviewScrollTop: 0,
  viewport: null,   // будет установлен при первом ресайзе
  gridViewport: null,
});
export default initialState;
export {initialState};