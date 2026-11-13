import fs from "fs";

export default function() {
	global.config = JSON.parse(fs.readFileSync(global.paths.config, 'utf8'));
	global.$.log('Конфигурация загружена');
}