import { useEffect, useRef } from 'react';
import { Sprite } from 'pixi.js';

/**
 * Создаёт сетку спрайтов в переданном контейнере и хранит их в ref.
 */
export function useGridSprites({
	gridContainer,
	fontTextures,
	width,
	height,
	cellWidth,
	cellHeight,
}) {
	const spritesRef = useRef([]);

	useEffect(() => {
		if (!fontTextures || !gridContainer) return;

		gridContainer.removeChildren();
		spritesRef.current = [];

		const cols = Math.ceil(width / cellWidth);
		const rows = Math.ceil(height / cellHeight);
		const chars = Array.from(fontTextures.keys());
		const sprites = [];

		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				const char = chars[(x + y * cols) % chars.length];
				const texture = fontTextures.get(char);
				if (!texture) continue;

				const sprite = new Sprite(texture);
				sprite.x = x * cellWidth;
				sprite.y = y * cellHeight;
				sprite.width = cellWidth;
				sprite.height = cellHeight;
				gridContainer.addChild(sprite);
				sprites.push(sprite);
			}
		}

		spritesRef.current = sprites;
	}, [fontTextures, gridContainer, width, height, cellWidth, cellHeight]);

	return spritesRef;
}