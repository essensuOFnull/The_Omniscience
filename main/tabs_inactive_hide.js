export default function () {
	if(!global.tabs)return;
	
	global.tabs.forEach((tab, i) => {
		if (i !== global.activeTabIndex) {
			tab.setBounds({ x: 0, y: 0, width: 0, height: 0 });
		}
	});
}