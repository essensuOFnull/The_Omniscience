import path from 'path';
import { pathToFileURL } from 'url';

export default async function () {
	// Загрузка оконных анимаций
	const animName = global.config.window_animation;
	const animPath = path.join(global.paths.projectRoot, 'themes', 'window_animations', `${animName}.js`);
	try {
		const animModule = await import(pathToFileURL(animPath.replaceAll('\\','/')).href);
		global.config.windows.animations = animModule.default;
		console.log(`[Themes] Window animation "${animName}" loaded.`);
	} catch (err) {
		console.error(`[Themes] Failed to load window animation "${animName}":`, err.message);
	}
}