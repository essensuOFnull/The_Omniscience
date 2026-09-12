import { useEffect } from 'react';
import * as THREE from 'three';

/**
 * Небо-панорама на заднем плане. Управляет своим canvas, рисует в rAF.
 *
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {{
 *   textureUrl: string,          // путь к equirect-панораме (jpg/png)
 *   speedX?: number,             // радиан/сек вращения по X
 *   speedY?: number,             // радиан/сек вращения по Y
 *   fov?: number,                // угол обзора
 *   background?: number,         // fallback-цвет, если текстура не загрузится
 * }} opts
 */
export function useThreeBackground(canvasRef, {
	textureUrl,
	speedX,
	speedY,
	fov,
	background = 0x000000,
}) {
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: false,           // фон — можно и без сглаживания
			alpha: false,
			powerPreference: 'low-power',
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(background);

		const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 1000);
		camera.position.set(0, 0, 0);
		camera.rotation.order = 'YXZ';

		let disposed = false;
		let cubeTex = null;
		if (textureUrl) {
			cubeTex = new THREE.CubeTextureLoader()
				.setPath(textureUrl)
				.load(
					['right.png', 'left.png', 'top.png', 'bottom.png', 'front.png', 'back.png'],
					undefined,
					undefined,
					(err) => console.warn('[three-bg] cubemap load error:', err),
				);
			cubeTex.colorSpace = THREE.SRGBColorSpace;
			scene.background = cubeTex;
		}

		const resize = () => {
			const w = window.innerWidth;
			const h = window.innerHeight;
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		};
		resize();
		window.addEventListener('resize', resize);

		let rafId = null;
		let lastT = performance.now();
		let yaw = 0,
			xaw = 0;//или как это должно называться лол, без понятия)

		const tick = (now) => {
			const dt = Math.min((now - lastT) / 1000, 0.1);
			lastT = now;
			yaw += speedX * dt;
			camera.rotation.y = yaw;
			xaw += speedY * dt;
			camera.rotation.x = xaw;
			renderer.render(scene, camera);
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);

		return () => {
			disposed = true;
			cancelAnimationFrame(rafId);
			window.removeEventListener('resize', resize);
			cubeTex?.dispose()
			renderer.dispose();
			if (scene.background && scene.background.isTexture) scene.background.dispose();
		};
	}, [canvasRef, textureUrl, speedX, speedY, fov, background]);
}