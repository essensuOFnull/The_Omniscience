import JSZip from 'jszip';
import { drawLayers, drawAllGlyphs, getLayerBounds, isPointInLayer, fillLayerWithGradient, assignLayerInfoToGlyphs } from './drawUtils';
import { saveAs } from 'file-saver';

function getCharFromGlyph(glyph, text) {
	if (!text) return '';
	return Array.from(text)[glyph.index % Array.from(text).length];
}

/**
 * Создаёт субпиксельный атлас символов.
 * Каждый символ рисуется с размером шрифта fontSize*3, затем ширина
 * сжимается с учётом widthScale. Высота канваса фиксирована для всех символов
 * и равна полной высоте шрифта (без вертикальной обрезки).
 */
export function createGlyphAtlas(text, fontFamily, fontSize, widthScale) {
	if (!text) return {};

	const uniqueChars = [...new Set(Array.from(text))];
	const atlas = {};
	const highResFontSize = fontSize * 3;
	const measureCanvas = document.createElement('canvas');
	const measureCtx = measureCanvas.getContext('2d');
	measureCtx.font = `${highResFontSize}px ${fontFamily}`;

	// Получаем метрики шрифта для определения высоты строки
	const metrics = measureCtx.measureText('Mg');
	const fontHeightSubpx = Math.ceil(metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent);
	// Высота канваса с запасом, но не меньше fontHeightSubpx
	const canvasHeight = Math.max(fontHeightSubpx, Math.ceil(highResFontSize * 1.2));

	for (const char of uniqueChars) {
		const naturalWidth = measureCtx.measureText(char).width; // ширина в high-res пикселях
		const targetWidthSubpx = Math.max(1, Math.round(naturalWidth * widthScale));

		// Рисуем символ в натуральном размере (high-res)
		const naturalCanvas = document.createElement('canvas');
		naturalCanvas.width = Math.ceil(naturalWidth);
		naturalCanvas.height = canvasHeight;
		const naturalCtx = naturalCanvas.getContext('2d');
		naturalCtx.font = `${highResFontSize}px ${fontFamily}`;
		naturalCtx.textBaseline = 'top';
		naturalCtx.fillStyle = '#fff';
		naturalCtx.fillText(char, 0, 0);

		// Сжимаем по горизонтали до целевой ширины (ширина в субпикселях)
		const targetCanvas = document.createElement('canvas');
		targetCanvas.width = targetWidthSubpx;
		targetCanvas.height = canvasHeight;
		const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
		targetCtx.imageSmoothingEnabled = true;
		targetCtx.imageSmoothingQuality = 'high';
		targetCtx.drawImage(
			naturalCanvas,
			0, 0, naturalCanvas.width, canvasHeight,
			0, 0, targetWidthSubpx, canvasHeight
		);

		// Извлекаем яркости (альфа-канал)
		const imageData = targetCtx.getImageData(0, 0, targetWidthSubpx, canvasHeight);
		const brightness = new Uint8ClampedArray(targetWidthSubpx * canvasHeight);
		for (let i = 0; i < brightness.length; i++) {
			brightness[i] = imageData.data[i * 4 + 3];
		}

		// Обрезаем по горизонтали: последний столбец с ненулевой яркостью
		let maxX = -1;
		for (let y = 0; y < canvasHeight; y++) {
			for (let x = targetWidthSubpx - 1; x >= 0; x--) {
				if (brightness[y * targetWidthSubpx + x] > 0) {
					if (x > maxX) maxX = x;
					break;
				}
			}
		}

		let usedWidth;
		if (maxX === -1) {
			usedWidth = targetWidthSubpx; // символ без чернил (пробел и т.п.) сохраняет ширину
		} else {
			usedWidth = maxX + 1;
		}

		// Копируем только используемую ширину, высота остаётся полной
		const trimmed = new Uint8ClampedArray(usedWidth * canvasHeight);
		for (let y = 0; y < canvasHeight; y++) {
			for (let x = 0; x < usedWidth; x++) {
				trimmed[y * usedWidth + x] = brightness[y * targetWidthSubpx + x];
			}
		}

		atlas[char] = {
			widthSubpx: usedWidth,
			heightSubpx: canvasHeight,
			brightness: trimmed,
		};
	}

	return atlas;
}

/**
 * Рендеринг субпиксельного текста с бинарной логикой.
 */
function renderSubpixelText(ctx, glyphs, textSettings, imageData, glyphAtlas) {
	if (!textSettings.text || !glyphs.length || !glyphAtlas) return;

	const width = imageData.width;
	const height = imageData.height;
	const finalDark = new Uint8Array(width * height * 3); // 0 – светлый, 1 – тёмный//эм... окей, но это не соответствует меметике человечества.

	// ---------- ЭТАП 1: Инициализация фона негативных глифов ----------
	for (let gi = 0; gi < glyphs.length; gi++) {
		const glyph = glyphs[gi];
		if (!glyph.char || glyph.negative === null) continue;
		if (!glyph.negative) continue; // обычный режим фон не заполняем

		const entry = glyphAtlas[glyph.char];
		if (!entry || entry.widthSubpx === 0 || entry.heightSubpx === 0) continue;

		const startX = Math.max(0, Math.floor(glyph.x));
		const endX = Math.max(Math.min(width, Math.ceil(glyph.x + glyph.width + Math.floor(textSettings.horizontalSpacing/2))),0);
		const startY = Math.max(0, Math.floor(glyph.y));
		const endY = Math.max(Math.min(height, Math.ceil(glyph.y + glyph.height + Math.floor(textSettings.verticalSpacing/2))),0);

		for (let dstY = startY; dstY < endY; dstY++) {
			const subY = dstY * 3 - glyph.ySubpx;
			if (subY < 0 || subY >= entry.heightSubpx) continue;

			for (let dstX = startX; dstX < endX; dstX++) {
				const subIdxBase = (dstY * width + dstX) * 3;
				// Весь пиксель затемняем (все три субпикселя)
				finalDark[subIdxBase] = 1;
				finalDark[subIdxBase + 1] = 1;
				finalDark[subIdxBase + 2] = 1;
			}
		}
	}

	// ---------- ЭТАП 2: Обработка чернил символов ----------
	for (let gi = 0; gi < glyphs.length; gi++) {
		const glyph = glyphs[gi];
		const char = glyph.char;
		if (!char || glyph.negative === null) continue;

		const entry = glyphAtlas[char];
		if (!entry || entry.widthSubpx === 0 || entry.heightSubpx === 0) continue;

		const { widthSubpx, heightSubpx, brightness } = entry;

		const startX = Math.max(0, Math.floor(glyph.x));
		const endX = Math.min(width, Math.ceil(glyph.x + glyph.width));
		const startY = Math.max(0, Math.floor(glyph.y));
		const endY = Math.min(height, Math.ceil(glyph.y + glyph.height));

		for (let dstY = startY; dstY < endY; dstY++) {
			const subY = dstY * 3 - glyph.ySubpx;
			if (subY < 0 || subY >= heightSubpx) continue;

			for (let dstX = startX; dstX < endX; dstX++) {
				const subXBase = dstX * 3 - glyph.xSubpx;
				const subIdxBase = (dstY * width + dstX) * 3;

				for (let k = 0; k < 3; k++) {
					const subX = subXBase + k;
					const subIdx = subIdxBase + k;

					let covered = false;
					if (subX >= 0 && subX < widthSubpx) {
						const val = brightness[subY * widthSubpx + subX];
						covered = val > 127;
					}
					//вне зависимости от режима, именно ИНВЕРТИРУЕМ)
					if (covered) {
						finalDark[subIdx] = !finalDark[subIdx];
					}
				}
			}
		}
	}

	// ---------- ПРИМЕНЕНИЕ МАСКИ ----------
	for (let i = 0; i < finalDark.length; i++) {
		if (finalDark[i] === 1) {
			const pixelIndex = Math.floor(i / 3) * 4;
			const channel = i % 3;
			imageData.data[pixelIndex + channel] = 0;
		}
	}
}

export const exportImage = (image, layers, glyphs, textSettings, glyphAtlas) => {
	if (!image) return;

	const canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;
	const ctx = canvas.getContext('2d');

	ctx.drawImage(image, 0, 0);
	const baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

	const visibleLayers = layers.filter(l => l.visible);

	// Рисуем градиенты слоёв (как в интерфейсе)
	visibleLayers.forEach(layer => {
		if (layer.colorPoints && layer.colorPoints.length > 0) {
			ctx.save();
			fillLayerWithGradient(ctx, layer);
			ctx.restore();
		}
	});

	const finalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

	// Копируем глифы и назначаем им верхний слой
	const updatedGlyphs = glyphs.map(g => ({ ...g }));
	assignLayerInfoToGlyphs(updatedGlyphs, layers);

	// Один вызов рендера субпиксельного текста
	renderSubpixelText(ctx, updatedGlyphs, textSettings, finalImageData, glyphAtlas);

	ctx.putImageData(finalImageData, 0, 0);

	canvas.toBlob((blob) => {
		saveAs(blob, 'exported.png');
	});
};

// Остальные функции (importImage, saveProject, openProject) остаются без изменений

export const openProject = async (dispatch) => {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.stg';
	input.onchange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		const zip = await JSZip.loadAsync(file);
		const imageFile = zip.file('image.png');
		const projectFile = zip.file('project.json');
		if (!imageFile || !projectFile) return;
		const imageBlob = await imageFile.async('blob');
		const projectData = JSON.parse(await projectFile.async('text'));
		const img = new Image();
		img.onload = () => {
			dispatch({ type: 'LOAD_PROJECT', payload: { image: img, ...projectData } });
		};
		img.src = URL.createObjectURL(imageBlob);
	};
	input.click();
};

export const saveProject = async (state) => {
	if (!state.image) return;
	const zip = new JSZip();
	// Добавляем изображение
	const imgBlob = await new Promise((resolve) => {
		const canvas = document.createElement('canvas');
		canvas.width = state.image.width;
		canvas.height = state.image.height;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(state.image, 0, 0);
		canvas.toBlob(resolve, 'image/png');
	});
	zip.file('image.png', imgBlob);
	// Добавляем JSON с параметрами
	zip.file('project.json', JSON.stringify({ layers: state.layers, activeLayerId: state.activeLayerId, showAllLayers: state.showAllLayers }));
	const blob = await zip.generateAsync({ type: 'blob' });
	saveAs(blob, 'project.stg');
};

export const importImage = (file, dispatch) => {
	const img = new Image();
	const url = URL.createObjectURL(file);
	img.onload = () => {
		dispatch({ type: 'SET_IMAGE', payload: { image: img, name: file.name } });
		URL.revokeObjectURL(url);
	};
	img.src = url;
};