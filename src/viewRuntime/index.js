import { useEffect, useState } from 'react';

// Кэш значений по path
const cache = new Map();
// path -> Set<setter>
const listeners = new Map();

let bootstrapped = false;

function ensureBootstrap() {
	if (bootstrapped) return;
	bootstrapped = true;

	const api = window.electron_view_API;
	if (!api) {
		console.warn('[viewStore] electron_view_API не найден — view работает вне моста?');
		return;
	}

	api.onStateUpdate(({ path, value }) => {
		cache.set(path, value);
		const fns = listeners.get(path);
		if (fns) for (const fn of fns) fn(value);
	});
}

/**
 * Подписка на срез state shell’а.
 * @param {string} path  напр. 'desktops.<desktopId>.isOverviewOpened'
 * @returns {*} текущее значение (или undefined, пока не пришло)
 */
export function useViewSetting(path) {
	const [value, setValue] = useState(() => cache.get(path));

	useEffect(() => {
		ensureBootstrap();

		let fns = listeners.get(path);
		if (!fns) {
			fns = new Set();
			listeners.set(path, fns);
			window.electron_view_API?.subscribe([path]);
		}
		fns.add(setValue);

		if (cache.has(path)) setValue(cache.get(path));

		return () => {
			fns.delete(setValue);
			if (fns.size === 0) {
				listeners.delete(path);
				window.electron_view_API?.unsubscribe([path]);
			}
		};
	}, [path]);

	return value;
}

/**
 * Диспатч действия в shell.
 * @param {string} type   имя экшена из windowManager
 * @param {object} payload
 */
export function viewDispatch(type, payload) {
	window.electron_view_API?.dispatch(type, payload);
}

export {
	useProjectRoot,
	isExternalUrl,
	isAbsolutePath,
	toFileUrl,
	resolveLocalPath,
	resolveForDisplay,
} from './paths';