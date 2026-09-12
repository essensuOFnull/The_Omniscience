import { useEffect } from 'react';

export function updateCell(cell, state) {
	const { bg, sprite } = cell;
	if (state.char !== undefined) sprite.texture = state.char;
	if (state.color !== undefined) sprite.tint = state.color;
	if (state.alpha !== undefined) sprite.alpha = state.alpha;
	if (bg) {
		if (state.bgColor !== undefined) bg.tint = state.bgColor;
		if (state.bgAlpha !== undefined) bg.alpha = state.bgAlpha;
	}
}

/**
 * @param {{
 *   app,
 *   cellsRef,
 *   fontTexturesRef,
 *   tpsRef?,
 *   cursorRef?: React.RefObject<{x:number,y:number,active:boolean}>,
 *   colsRef?: React.RefObject<number>,  // если хранится отдельно
 *   cursorRadius?: number,              // в пикселях
 *   cursorFalloff?: number,             // 1 = линейно, >1 = мягче к краю, <1 = резче
 * }} args
 */
export function useRenderLoop({
	app,
	cellsRef,
	fontTexturesRef,
	tpsRef,
	cursorRef,
	cursorRadius = 120,
	cursorFalloff = 1,
}) {
	useEffect(() => {
		if (!app) return;

		let frameCount = 0;
		let lastFpsUpdate = performance.now();

		const tick = () => {
			const cells = cellsRef.current;
			const map = fontTexturesRef.current;
			if (!map || !cells || cells.length === 0) return;

			const textures = Array.from(map.values());
			const n = textures.length;

			for (let i = 0; i < cells.length; i++) {
				if(Math.random()<0.9)continue;//не меняем ячейку с некоторым шансом - так оптимизированнее и выглядит круче)
				const cell = cells[i];
				updateCell(cell, {
					char: textures[(Math.random() * n) | 0],
					color: (Math.random() * 0xffffff) | 0,
					alpha: 1,
					bgColor: (Math.random() * 0xffffff) | 0,
					bgAlpha: Math.random(),
				});
			}

			// ─── эффект курсора ───────────────────────────────────────
			const cursor = cursorRef?.current;
			if (cursor && cursor.active) {
				const cw = cells[0]?.bg?.width || 16;
				const ch = cells[0]?.bg?.height || 16;
				const r2 = cursorRadius * cursorRadius;
				const cx = cursor.x;
				const cy = cursor.y;

				// Предполагаем, что ячейки идут в порядке (row-major) и заполняют
				// прямоугольную область. Колонки восстанавливаем из геометрии bg.
				// Если у вас есть colsRef — используйте его, будет надёжнее.
				const cols = cellsRef.current.cols || 1;

				for (let i = 0; i < cells.length; i++) {
					const col = i % cols;
					const row = (i / cols) | 0;
					const dx = cx - (col * cw + cw / 2);
					const dy = cy - (row * ch + ch / 2);
					const d2 = dx * dx + dy * dy;
					if (d2 >= r2) continue;

					const t = Math.pow(Math.sqrt(d2) / cursorRadius, cursorFalloff);
					// t=0 в центре, t=1 на краю. На краю — 1, в центре — 0.
					cells[i].bg.alpha = t;
					cells[i].sprite.alpha = 0;//вообще отключаем символы в затронутых ячейках, так выглядит правда круче) в теории наверное лучше было заменить на пробел, но раз тут уже делается через alpha - мне так проще изменить)
				}
			}

			frameCount++;
			const now = performance.now();
			const dt = now - lastFpsUpdate;
			if (dt >= 1000) {
				const fps = ((frameCount * 1000) / dt).toFixed(2);
				const tps = (tpsRef?.current ?? 60).toFixed(2);
				document.title = `CODERROR - очередная попытка - TPS: ${tps} - FPS: ${fps}`;
				frameCount = 0;
				lastFpsUpdate = now;
			}
		};

		app.ticker.add(tick);
		return () => app.ticker.remove(tick);
	}, [app, cellsRef, fontTexturesRef, tpsRef, cursorRef, cursorRadius, cursorFalloff]);
}