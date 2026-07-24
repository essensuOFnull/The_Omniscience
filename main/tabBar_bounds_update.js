export default function () {
	const isFullScreen=global.isFullScreen;
	global.tabBar.setBounds({
		x: 0,
		y: 0,
		width: isFullScreen ? 0 : global.mainWindowWidth,
		height:isFullScreen ? 0 : global.config.tabBarHeight
	});
}