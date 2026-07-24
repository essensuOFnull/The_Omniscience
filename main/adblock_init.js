import { ElectronBlocker } from '@ghostery/adblocker-electron';
import electronPkg from 'electron';
const{session,app}=electronPkg;
import fetch from 'cross-fetch'; // Нужен для скачивания списков блокировки
import fs from 'fs';
import path from 'path';

export default async function () {
	// Путь к файлу кэша в папке userdata вашего браузера
	const cachePath = path.join(app.getPath('userData'), 'adblock_cache.bin');

	let blocker;

	if (fs.existsSync(cachePath)) {
		// Если файл есть — моментально загружаем из локального файла
		blocker = ElectronBlocker.deserialize(new Uint8Array(fs.readFileSync(cachePath)));
	} else {
		// Если запускается первый раз — качаем из сети и сохраняем на диск
		blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
		fs.writeFileSync(cachePath, blocker.serialize());
	}

	// Применяем
	blocker.enableBlockingInSession(session.defaultSession);
	console.log('[AdBlock] inited');
}