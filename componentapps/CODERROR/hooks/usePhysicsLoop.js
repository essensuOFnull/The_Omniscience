import { useEffect, useRef } from 'react';
import {
	updateMiniLocations,
	highlightMiniLocations,
} from '../components/CodeMirror6.jsx';

const TPS = 60;
const FIXED_DT = 1000 / TPS;
const MAX_FRAME_MS = 250; // защита от «спирали смерти» при табе в фоне

/**
 * Цикл физики (60 tps): подсветка активных haps в CodeMirror.
 * Использует rAF + аккумулятор для стабильного фиксированного шага.
 *
 * @param {{
 *   enabled: boolean,
 *   replRef, patternRef, miniLocationsRef, viewRef,
 *   tpsRef?: React.RefObject<number>,   // ← сюда пишется измеренный TPS
 * }} args
 */
export function usePhysicsLoop({
	enabled,
	replRef,
	patternRef,
	miniLocationsRef,
	viewRef,
	tpsRef,
}) {
	const appliedMiniLocsRef = useRef(false);

	useEffect(() => {
		if (!enabled) return;
		let cancelled = false;
		let rafId = null;
		let last = performance.now();
		let acc = 0;
		let tickCount = 0;

		// Счётчики для измерения реального TPS
		let stepCount = 0;
		let lastTpsUpdate = performance.now();

		const step = () => {
			tickCount++;

			const view = viewRef.current;
			const pat = patternRef.current;
			const locs = miniLocationsRef.current;
			const r = replRef.current;

			if (!view || !pat || !r) return;

			// Однократная передача miniLocations (без рекурсии в onUpdate).
			if (locs && !appliedMiniLocsRef.current) {
				updateMiniLocations(view, locs);
				appliedMiniLocsRef.current = true;
				console.log('[hl] miniLocations applied, n=', locs.length);
			}

			try {
				const now =
					typeof r.scheduler?.now === 'function' ? r.scheduler.now() : 0;
				const haps = pat
					.queryArc(now, now + 1 / 120)
					.filter((h) => h.hasOnset());
				highlightMiniLocations(view, now, haps);
			} catch (err) {
				if (tickCount <= 5) console.warn('[hl] error:', err);
			}
		};

		const loop = (now) => {
			if (cancelled) return;
			let delta = now - last;
			if (delta > MAX_FRAME_MS) delta = MAX_FRAME_MS;
			last = now;
			acc += delta;

			while (acc >= FIXED_DT) {
				step();
				stepCount++;
				acc -= FIXED_DT;
			}

			// Раз в секунду публикуем измеренный TPS
			if (tpsRef) {
				const nowWall = performance.now();
				const dtWall = nowWall - lastTpsUpdate;
				if (dtWall >= 1000) {
					tpsRef.current = (stepCount * 1000) / dtWall;
					stepCount = 0;
					lastTpsUpdate = nowWall;
				}
			}

			rafId = requestAnimationFrame(loop);
		};

		rafId = requestAnimationFrame(loop);

		return () => {
			cancelled = true;
			if (rafId) cancelAnimationFrame(rafId);
		};
	}, [enabled, replRef, patternRef, miniLocationsRef, viewRef, tpsRef]);

	return appliedMiniLocsRef;
}