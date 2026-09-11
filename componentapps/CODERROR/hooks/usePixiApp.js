import { useEffect, useState } from 'react';
import { Application, Container } from 'pixi.js';

/**
 * Инициализирует Pixi.Application и корневой Container для сетки.
 * Возвращает ссылку на app/gridContainer после готовности.
 */
export function usePixiApp(containerRef, width, height) {
	const [app, setApp] = useState(null);
	const [gridContainer, setGridContainer] = useState(null);

	useEffect(() => {
		let cancelled = false;
		let instance;

		(async () => {
			const a = new Application();
			await a.init({
				width: window.innerWidth,
				height: window.innerHeight,
				backgroundAlpha: 0,
				antialias: false,
				resolution: window.devicePixelRatio || 1,
				autoDensity: true,
			});

			if (cancelled) {
				a.destroy(true);
				return;
			}

			instance = a;
			containerRef.current?.appendChild(a.canvas);

			const gc = new Container();
			a.stage.addChild(gc);

			setApp(a);
			setGridContainer(gc);
		})();

		return () => {
			cancelled = true;
			if (instance) {
				instance.destroy(true, {
					children: true,
					texture: true,
					baseTexture: true,
				});
			}
			setApp(null);
			setGridContainer(null);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (app) app.renderer.resize(width, height);
	}, [app, width, height]);

	return { app, gridContainer };
}