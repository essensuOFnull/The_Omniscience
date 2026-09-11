import { useEffect } from 'react';

/**
 * Рендер-цикл: тинт + случайная текстура спрайтов.
 * Работает на Pixi.Ticker (по rAF).
 */
export function useRenderLoop({ app, spritesRef, fontTexturesRef }) {
	useEffect(() => {
		if (!app) return;

		let frameCount = 0;
		let lastFpsUpdate = performance.now();

		const tick = () => {
			const sprites = spritesRef.current;
			const map = fontTexturesRef.current;
			if (!map || sprites.length === 0) return;

			const textures = Array.from(map.values());
			const n = textures.length;

			for (let i = 0; i < sprites.length; i++) {
				const sprite = sprites[i];
				sprite.texture = textures[(Math.random() * n) | 0];
				sprite.tint = Math.random() * 0xffffff;
			}

			frameCount++;
			const now = performance.now();
			if (now - lastFpsUpdate >= 1000) {
				const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
				document.title = `CODERROR - очередная попытка - FPS: ${fps}`;
				frameCount = 0;
				lastFpsUpdate = now;
			}
		};

		app.ticker.add(tick);
		return () => app.ticker.remove(tick);
	}, [app, spritesRef, fontTexturesRef]);
}