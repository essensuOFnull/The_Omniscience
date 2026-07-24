export default function (activeTabIndex) {
    global.activeTabIndex = activeTabIndex;
    global.$.tab_active_bounds_update();
    global.$.tabs_inactive_hide();
    global.$.tabs_send_updated();
}