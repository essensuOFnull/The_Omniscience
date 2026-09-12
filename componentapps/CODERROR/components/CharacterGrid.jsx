import React, { useRef } from 'react';
import { usePixiApp } from '../hooks/usePixiApp.js';
import { useFontAtlas } from '../hooks/useFontAtlas.js';
import { useGridSprites } from '../hooks/useGridSprites.js';
import { useRenderLoop } from '../hooks/useRenderLoop.js';
import LoadingOverlay from './LoadingOverlay.jsx';

import { useCursor } from '../hooks/useCursor.js';

import { useThreeBackground } from '../hooks/useThreeBackground.js';

export default function CharacterGrid({
	width,
	height,
	cellWidth,
	cellHeight,
	fontFamily,
	tpsRef
}) {
	const containerRef = useRef(null);
	const cursorRef = useCursor(containerRef);
	const threeCanvasRef = useRef(null);

	// фон
	useThreeBackground(threeCanvasRef, {
		textureUrl: '../../../componentapps/CODERROR/textures/MainMenu/cubemap/', // ← подставьте свой путь
		speedX: 1,
		speedY:0.5,
		fov: 75,
	});

	const { app, gridContainer } = usePixiApp(containerRef, width, height);
	const { fontTextures, fontTexturesRef, isLoading } = useFontAtlas({
		ready: !!app,
		cellWidth,
		cellHeight,
		fontFamily,
	});
	const cellsRef = useGridSprites({
		gridContainer,
		fontTextures,
		width,
		height,
		cellWidth,
		cellHeight,
	});

	useRenderLoop({
		app, cellsRef, fontTexturesRef, tpsRef,
		cursorRef,
		cursorRadius: 120,
		cursorFalloff: 1,
	});

	return (
		<>
			<canvas
				ref={threeCanvasRef}
				style={{
					position: 'absolute',
					inset: 0,
					width: '100%',
					height: '100%',
					zIndex: 0,
					display: 'block',
				}}
			/>
			<div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0 }} />
			{isLoading && <LoadingOverlay />}
		</>
	);
}