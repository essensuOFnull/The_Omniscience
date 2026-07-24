import electronPkg from 'electron';
const{session}=electronPkg;
import { ElectronChromeExtensions, setSessionPartitionResolver } from 'electron-chrome-extensions';
import { readdir, stat, mkdir, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

export default async function() {
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

		// 0. Создаём временный файл фильтра для регистрации
		const tmpDir = path.join(global.paths.projectRoot, '.temp');
		await mkdir(tmpDir, { recursive: true });
		const filterPath = path.join(tmpDir, 'filterPreload.js');
		await writeFile(filterPath, global._.theme_css_filter, 'utf-8');
		console.log('filterPreload.js written for registration');

		// 1. Preload chrome-extensions
		try {
			const extPreloadUrl = import.meta.resolve('electron-chrome-extensions/preload');
			const extPreloadPath = fileURLToPath(extPreloadUrl);
			await defaultSession.registerPreloadScript({
				id: 'chrome-extensions-preload',
				type: 'frame',
				filePath: extPreloadPath,
			});
			console.log('[Extensions] Chrome extensions preload registered');
		} catch (err) {
			console.error('[Extensions] Failed to register chrome-extensions preload:', err.message);
			return;
		}

		// 2. Preload фильтра (через filePath)
		try {
			await defaultSession.registerPreloadScript({
				id: 'omniscience-filter',
				type: 'frame',
				filePath: filterPath,
			});
			console.log('[Extensions] Omniscience filter preload registered');
		} catch (err) {
			console.error('[Extensions] Failed to register filter preload:', err.message);
		}

		// 3. Резолвер сессии
		setSessionPartitionResolver(() => defaultSession);

		// 4. Менеджер расширений
		const extensionManager = new ElectronChromeExtensions({
			license: 'GPL-3.0',
			session: defaultSession,
			injectWebview: true,
			createTab: async (details) => {
				const view = global.$.tab_create(details.url || 'about:blank', 'webtab', undefined);
				return [view.webContents, global.mainWindow];
			},
			selectTab: (webContents) => {
				const idx = global.tabs.findIndex(t => t.webContents.id === webContents.id);
				if (idx !== -1) global.$.tab_activate(idx);
			},
			removeTab: (webContents) => {
				const idx = global.tabs.findIndex(t => t.webContents.id === webContents.id);
				if (idx !== -1) global.$.tab_close(idx);
			}
		});

		global.extensionManager = extensionManager;
		console.log('[Extensions] Manager created');

		// 5. Загрузка расширений
		const extensionsDir = global.paths.extensionsDir;
		try {
			const entries = await readdir(extensionsDir);
			for (const entry of entries) {
				const fullPath = path.join(extensionsDir, entry);
				const folderStat = await stat(fullPath);
				if (folderStat.isDirectory()) {
					try {
						const ext = await defaultSession.loadExtension(fullPath, { allowFileAccess: true });
						console.log(`[Extensions] Loaded: ${entry} (id: ${ext.id})`);
					} catch (err) {
						console.error(`[Extensions] Error loading ${entry}: ${err.message}`);
					}
				}
			}
		} catch (err) {
			console.warn('[Extensions] Extensions directory not found or empty:', err.message);
		}
	} catch (error) {
		console.error('[Extensions] Setup failed:', error);
	}
}