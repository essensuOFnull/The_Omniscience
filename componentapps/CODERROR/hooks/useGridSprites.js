import { useEffect, useRef } from 'react';
import { Sprite, Texture } from 'pixi.js';

/**
 * Создаёт сетку ячеек в переданном контейнере.
 * Каждая ячейка — это пара { bg, sprite }:
 *   bg     — Sprite(Texture.WHITE), подложка (цвет/alpha задаются через tint/alpha)
 *   sprite — Sprite с глифом символа
 *
 * Возвращает ref на массив ячеек.
 */
export function useGridSprites({
	gridContainer,
	fontTextures,
	width,
	height,
	cellWidth,
	cellHeight,
}) {
	const cellsRef = useRef([]);

	useEffect(() => {
		if (!fontTextures || !gridContainer) return;

		gridContainer.removeChildren();
		cellsRef.current = [];

		const cols = Math.ceil(width / cellWidth);
		const rows = Math.ceil(height / cellHeight);
		const chars = Array.from(fontTextures.keys());
		if (chars.length === 0) return;

		const cells = [];

		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				const px = x * cellWidth;
				const py = y * cellHeight;

				const char = chars[(x + y * cols) % chars.length];
				const texture = fontTextures.get(char);
				if (!texture) continue;

				// Фон: белый пиксель, растянутый на всю ячейку.
				// Изначально прозрачный, чтобы до первого тика не мигало белым.
				const bg = new Sprite(Texture.WHITE);
				bg.x = px;
				bg.y = py;
				bg.width = cellWidth;
				bg.height = cellHeight;
				bg.alpha = 0;
				gridContainer.addChild(bg);

				// Глиф
				const sprite = new Sprite(texture);
				sprite.x = px;
				sprite.y = py;
				sprite.width = cellWidth;
				sprite.height = cellHeight;
				gridContainer.addChild(sprite);

				cells.push({ bg, sprite });
			}
		}

		cellsRef.current = cells;
		cellsRef.current.cols = cols;
	}, [fontTextures, gridContainer, width, height, cellWidth, cellHeight]);

	return cellsRef;
}