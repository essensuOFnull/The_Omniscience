import electronPkg from 'electron';
const { session, ipcMain } = electronPkg;
import { ElectronChromeExtensions, setSessionPartitionResolver } from 'electron-chrome-extensions';
import { readdir, stat, mkdir, rm, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import AdmZip from 'adm-zip';

// Функция для распаковки .crx (формат CRX3)
async function extractCrx(crxPath, destDir) {
	const buffer = await readFile(crxPath);

	// Проверка магического числа
	if (buffer.toString('utf8', 0, 4) !== 'Cr24') {
		throw new Error('Неверный формат CRX: отсутствует магическое число Cr24');
	}

	const version = buffer.readUInt32LE(4);
	if (version !== 3) {
		throw new Error(`Неподдерживаемая версия CRX: ${version}. Поддерживается только CRX3.`);
	}

	const headerLength = buffer.readUInt32LE(8);
	const zipBuffer = buffer.subarray(12 + headerLength); // пропускаем заголовок CRX
	const zip = new AdmZip(zipBuffer);
	zip.extractAllTo(destDir, true); // true = перезаписывать файлы
}

export default async function () {
	try {
		const defaultSession = session.defaultSession;
		global.extensionsSession = defaultSession;

		// === Снятие CSP для всей сессии ===
		defaultSession.webRequest.onHeadersReceived((details, callback) => {
			callback({
				responseHeaders: {
					...details.responseHeaders,
					'content-security-policy': [
						"default-src * 'unsafe-inline' 'unsafe-eval' data: blob: filesystem:;"
					]
				}
			});
		});
		console.log('[Extensions] CSP disabled for all sites in session');

		// 1. Регистрируем НАШ общий preload как session-preload для всех frame.
		//    В нём уже вклеены chrome.* API из electron-chrome-extensions.
		try {
			await defaultSession.registerPreloadScript({
				id: 'omniscience-sw-preload',
				type: 'service-worker',//ВАЖНО
				filePath: global.paths.extensionsPreload,
			});
			await defaultSession.registerPreloadScript({
				id: 'omniscience-common-preload',
				type: 'frame',//ВАЖНО
				filePath: global.paths.reactPreload,
			});
			console.log('[Extensions] Common preload registered for session');
		} catch (err) {
			console.error('[Extensions] Failed to register common preload:', err.message);
			return;
		}

		// 3. Резолвер сессии
		setSessionPartitionResolver(() => defaultSession);

		// 4. Менеджер расширений
		const extensionManager = new ElectronChromeExtensions({
			license: 'GPL-3.0',
			session: defaultSession,
			injectWebview: true
		});

		global.extensionManager = extensionManager;
		console.log('[Extensions] Manager created');

		// 5. Загрузка расширений
		const extensionsDir = global.paths.extensionsDir;
		// Папка для распакованных .crx (временная)
		const tempExtractDir = path.join(
			global.paths.userData || path.dirname(extensionsDir),
			'extracted-extensions'
		);

		try {
			await mkdir(tempExtractDir, { recursive: true });

			const entries = await readdir(extensionsDir);
			for (const entry of entries) {
				const fullPath = path.join(extensionsDir, entry);
				const folderStat = await stat(fullPath);

				let extensionPath = fullPath;

				// Если это .crx — распаковываем
				if (folderStat.isFile() && path.extname(entry).toLowerCase() === '.crx') {
					console.log(`[Extensions] Обнаружен .crx: ${entry}, распаковка...`);

					const extractDest = path.join(tempExtractDir, path.basename(entry, '.crx'));
					await rm(extractDest, { recursive: true, force: true });
					await mkdir(extractDest, { recursive: true });

					try {
						await extractCrx(fullPath, extractDest);
						console.log(`[Extensions] .crx распакован в: ${extractDest}`);
						extensionPath = extractDest;
					} catch (extractErr) {
						console.error(`[Extensions] Ошибка распаковки ${entry}:`, extractErr.message);
						continue; // пропускаем этот файл
					}
				} else if (!folderStat.isDirectory()) {
					console.warn(`[Extensions] Пропуск (не папка и не .crx): ${entry}`);
					continue;
				}

				// Загружаем расширение (из папки или из распакованного .crx)
				try {
					const ext = await defaultSession.extensions.loadExtension(extensionPath, {
						allowFileAccess: true
					});
					console.log(`[Extensions] Загружено: ${entry} (id: ${ext.id})`);
				} catch (err) {
					console.error(`[Extensions] Ошибка загрузки ${entry}: ${err.message}`);
				}
			}
		} catch (err) {
			console.warn('[Extensions] Папка расширений не найдена или пуста:', err.message);
		}
	} catch (error) {
		console.error('[Extensions] Ошибка инициализации:', error);
	}
	/* -------- Extension list / popup API -------- */

	ipcMain.handle('get-extensions-list', () => {
		try {
			const session = global.extensionsSession;
			if (!session) return [];

			const exts = session.extensions?.getAllExtensions?.() || [];

			return exts.map((e) => ({
				id: `extension:${e.id}`,
				extensionId: e.id,
				title: e.name || e.id,
				icon: null, // позже можно вытянуть из manifest.icons
				kind: 'extension',
				version: e.version || '',
				hasPopup: !!(e.manifest?.action?.default_popup || e.manifest?.browser_action?.default_popup),
			}));
		} catch (err) {
			console.error('[get-extensions-list]', err.message);
			return [];
		}
	});

	ipcMain.handle('get-extension-popup-url', (_e, { extensionId }) => {
		try {
			const session = global.extensionsSession;
			if (!session) return null;

			const exts = session.extensions?.getAllExtensions?.() || [];
			const ext = exts.find((e) => e.id === extensionId);
			if (!ext) return null;

			const popupPath =
				ext.manifest?.action?.default_popup ||
				ext.manifest?.browser_action?.default_popup ||
				null;

			if (!popupPath) return null;

			return `chrome-extension://${ext.id}/${popupPath}`;
		} catch (err) {
			console.error('[get-extension-popup-url]', err.message);
			return null;
		}
	});
}