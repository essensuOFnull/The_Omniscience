import React, { useRef } from 'react';
import { usePixiApp } from '../hooks/usePixiApp.js';
import { useFontAtlas } from '../hooks/useFontAtlas.js';
import { useGridSprites } from '../hooks/useGridSprites.js';
import { useRenderLoop } from '../hooks/useRenderLoop.js';
import LoadingOverlay from './LoadingOverlay.jsx';

export default function CharacterGrid({
	width,
	height,
	cellWidth,
	cellHeight,
	fontFamily,
}) {
	const containerRef = useRef(null);

	const { app, gridContainer } = usePixiApp(containerRef, width, height);
	const { fontTextures, fontTexturesRef, isLoading } = useFontAtlas({
		ready: !!app,
		cellWidth,
		cellHeight,
		fontFamily,
	});
	const spritesRef = useGridSprites({
		gridContainer,
		fontTextures,
		width,
		height,
		cellWidth,
		cellHeight,
	});

	useRenderLoop({ app, spritesRef, fontTexturesRef });

	return (
		<>
			<div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0 }} />
			{isLoading && <LoadingOverlay />}
		</>
	);
}