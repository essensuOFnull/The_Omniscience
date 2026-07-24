// tab_move.js
export default function(fromIndex, toIndex) {
    const tabs = global.tabs;
    if (!tabs || fromIndex < 0 || fromIndex >= tabs.length || toIndex < 0 || toIndex >= tabs.length) return;
    const [movedTab] = tabs.splice(fromIndex, 1);
    tabs.splice(toIndex, 0, movedTab);
    // если нужно подправить activeTabIndex
    if (global.activeTabIndex === fromIndex) {
        global.activeTabIndex = toIndex;
    } else if (fromIndex < global.activeTabIndex && toIndex >= global.activeTabIndex) {
        global.activeTabIndex--;
    } else if (fromIndex > global.activeTabIndex && toIndex <= global.activeTabIndex) {
        global.activeTabIndex++;
    }
}