import fs from "fs";

export default function() {
	const parsed = JSON.parse(fs.readFileSync(global.paths.config, 'utf8'));
	global.config = {
		...global.config,
		...parsed,
		viteBase: `${parsed.viteProtocol}://${parsed.viteHost}:${parsed.vitePort}`
	};
	global.$.log('Конфгурация загружена');
	global.$.animation_window_load();
}