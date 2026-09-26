import { useEffect, useRef } from 'react';
import { settingsStore } from '../settings/store';

function getByPath(obj, path) {
	if (!path) return obj;
	return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

// Резолвер: path либо в reducer state, либо в settingsStore
function readPath(state, path) {
	if (path.startsWith('settings.')) {
		return getByPath(settingsStore.getState(), path.slice('settings.'.length));
	}
	return getByPath(state, path);
}

/**
 * Мост shell ↔ views. Монтируется один раз в Desktop.jsx.
 *  - принимает dispatch-сообщения от views и прокидывает их в reducer / settingsStore
 *  - ведёт реестр подписок (fromId + path)
 *  - при изменении state или настроек рассылает срезы подписчикам
 */
export default function useViewStateBridge(state, dispatch) {
	const stateRef = useRef(state);
	stateRef.current = state;

	const subscribersRef = useRef(new Map()); // key: `${fromId}:${path}`
	const lastSentRef = useRef(new Map());

	// pushUpdates через ref — чтобы не пересоздавать подписку на settingsStore
	const pushUpdatesRef = useRef(null);
	pushUpdatesRef.current = (currentState) => {
		const api = window.electron_desktop_API;
		if (!api) return;
		if (subscribersRef.current.size === 0) return;

		for (const { fromId, path } of subscribersRef.current.values()) {
			const value = readPath(currentState, path);
			const key = `${fromId}:${path}`;
			const last = lastSentRef.current.get(key);
			if (last === value) continue;

			lastSentRef.current.set(key, value);
			api.send('shell:send-to-view', {
				toId: fromId,
				channel: 'view:state-update',
				data: { path, value },
			});
		}
	};

	// ---- Подписка на события от main ----
	useEffect(() => {
		const api = window.electron_desktop_API;
		if (!api) return;

		const offDispatch = api.on('shell:view-dispatch', ({ type, payload }) => {
			// Спецтип: не reducer, а settingsStore
			if (type === 'updateSetting') {
				const { path, value } = payload || {};
				if (typeof path === 'string') {
					settingsStore.update(path, value);
				}
				return;
			}
			dispatch({ type, payload });
		});

		const offSubscribe = api.on('shell:view-subscribe', ({ fromId, paths }) => {
			for (const path of paths) {
				const key = `${fromId}:${path}`;
				subscribersRef.current.set(key, { fromId, path });
				lastSentRef.current.delete(key);

				const value = readPath(stateRef.current, path);
				lastSentRef.current.set(key, value);
				api.send('shell:send-to-view', {
					toId: fromId,
					channel: 'view:state-update',
					data: { path, value },
				});
			}
		});

		const offUnsubscribe = api.on('shell:view-unsubscribe', ({ fromId, paths }) => {
			for (const path of paths) {
				const key = `${fromId}:${path}`;
				subscribersRef.current.delete(key);
				lastSentRef.current.delete(key);
			}
		});

		const offGone = api.on('shell:view-gone', ({ fromId }) => {
			for (const key of [...subscribersRef.current.keys()]) {
				if (key.startsWith(`${fromId}:`)) {
					subscribersRef.current.delete(key);
					lastSentRef.current.delete(key);
				}
			}
		});

		return () => {
			offDispatch?.();
			offSubscribe?.();
			offUnsubscribe?.();
			offGone?.();
		};
	}, [dispatch]);

	// ---- Рассылка при изменении reducer state ----
	useEffect(() => {
		pushUpdatesRef.current(state);
	}, [state]);

	// ---- Рассылка при изменении settingsStore ----
	useEffect(() => {
		const unsubscribe = settingsStore.subscribe(() => {
			pushUpdatesRef.current(stateRef.current);
		});
		return unsubscribe;
	}, []);
}