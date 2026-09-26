import { useState, useEffect } from 'react';

const URL_RE = /^(https?|data|blob|file):\/\//i;
const ABS_RE = /^([a-zA-Z]:[\\/]|\/)/;

let _cachedRoot = null;
let _pendingRoot = null;

function fetchRoot() {
	if (_cachedRoot !== null) return Promise.resolve(_cachedRoot);
	if (!_pendingRoot) {
		_pendingRoot = (window.electron_view_API?.getProjectRoot?.() || Promise.resolve(''))
			.then((r) => { _cachedRoot = r || ''; return _cachedRoot; });
	}
	return _pendingRoot;
}

export function useProjectRoot() {
	const [root, setRoot] = useState(_cachedRoot);
	useEffect(() => {
		if (_cachedRoot !== null) { setRoot(_cachedRoot); return; }
		let alive = true;
		fetchRoot().then((r) => { if (alive) setRoot(r); });
		return () => { alive = false; };
	}, []);
	return root;
}

export function isExternalUrl(path) {
	return URL_RE.test(String(path || ''));
}

export function isAbsolutePath(path) {
	return ABS_RE.test(String(path || ''));
}

/**
 * Локальный путь → file:// URL. Внешние URL пропускаем как есть.
 */
export function toFileUrl(path) {
	if (!path) return path;
	if (URL_RE.test(path)) return path;
	let p = String(path).replace(/\\/g, '/');
	if (!p.startsWith('/')) p = '/' + p;
	return 'file://' + p;
}

/**
 * Относительный локальный путь → абсолютный (от projectRoot).
 * Внешние URL и абсолютные пути возвращает как есть.
 */
export function resolveLocalPath(path, projectRoot) {
	if (!path) return path;
	if (isExternalUrl(path)) return path;
	if (isAbsolutePath(path)) return path;
	if (!projectRoot) return path;

	const sep = projectRoot.includes('\\') ? '\\' : '/';
	const rootClean = projectRoot.replace(/[\\/]+$/, '');
	const relParts = String(path)
		.replace(/\\/g, '/')
		.replace(/^\.\//, '')
		.split('/')
		.filter((p) => p && p !== '.');

	const parts = rootClean.replace(/\\/g, '/').split('/');
	for (const p of relParts) {
		if (p === '..') parts.pop();
		else parts.push(p);
	}
	return parts.join(sep);
}

/**
 * Готовый хелпер: resolve + file://. Возвращает строку, пригодную для src/url().
 */
export function resolveForDisplay(path, projectRoot) {
	if (!path) return path;
	if (isExternalUrl(path)) return path;
	if (!isAbsolutePath(path)) {
		path = resolveLocalPath(path, projectRoot) || path;
	}
	return toFileUrl(path);
}