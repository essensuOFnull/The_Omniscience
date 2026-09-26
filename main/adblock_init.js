import { ElectronBlocker } from '@ghostery/adblocker-electron';
import electronPkg from 'electron';
const { session, app } = electronPkg;
import fetch from 'cross-fetch'; // Нужен для скачивания списков блокировки
import fs from 'fs';
import path from 'path';

export default async function () {
	// Путь к файлу кэша в папке userdata вашего браузера
	const cachePath = path.join(app.getPath('userData'), 'adblock_cache.bin');

	let blocker;

	try {
		if (fs.existsSync(cachePath)) {
			// Если файл есть — моментально загружаем из локального файла
			blocker = ElectronBlocker.deserialize(new Uint8Array(fs.readFileSync(cachePath)));
		} else {
			// Если запускается первый раз — качаем из сети и сохраняем на диск
			blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
			fs.writeFileSync(cachePath, blocker.serialize());
		}
	} catch (error) {
		// Защита от дурака: если мажорные версии движка не совпали или кэш битый
		console.warn('[AdBlock] Ошибка загрузки кэша (возможно, обновилась версия). Сбрасываем...');
		
		try {
			if (fs.existsSync(cachePath)) {
				fs.unlinkSync(cachePath); // Удаляем злополучный файл кэша
			}
		} catch (unlinkError) {
			console.error('[AdBlock] Не удалось удалить битый файл кэша:', unlinkError);
		}

		// Экстренно качаем чистую базу из сети и сохраняем правильную версию на диск
		blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
		fs.writeFileSync(cachePath, blocker.serialize());
	}

	// Применяем
	blocker.enableBlockingInSession(session.defaultSession);
	console.log('[AdBlock] inited');
}