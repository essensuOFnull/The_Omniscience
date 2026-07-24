export default function () {
	if (global.config.theme.app == 'dark') {
		global.$.theme_dark_set();
	} else if (global.config.theme.app == 'light') {
		global.$.theme_light_set();
	}
}