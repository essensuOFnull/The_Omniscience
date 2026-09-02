import JSZip from 'jszip';
import { drawLayers, drawAllGlyphs, getLayerBounds, isPointInLayer, fillLayerWithGradient } from './drawUtils';
import { saveAs } from 'file-saver';

// Вспомогательная функция: получить символ по глифу и тексту
function getCharFromGlyph(glyph, text) {
	if (!text) return '';
	return text[glyph.index % text.length];
}

// Рендеринг субпиксельного текста для слоя
function renderSubpixelText(ctx, layer, glyphs, textSettings, imageData) {
	const { text, fontFamily, fontSize } = textSettings;
	if (!text || !fontFamily || !fontSize || !glyphs || glyphs.length === 0) return;

	const font = `${fontSize}px ${fontFamily}`;
	const tempCanvas = document.createElement('canvas');
	const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
	tempCtx.font = font;

	const imageWidth = imageData.width;
	const imageHeight = imageData.height;
	const data = imageData.data;

	glyphs.forEach(glyph => {
		const centerX = glyph.x + glyph.width / 2;
		const centerY = glyph.y + glyph.height / 2;
		if (!isPointInLayer(centerX, centerY, layer)) return;

		const char = getCharFromGlyph(glyph, text);
		if (!char) return;

		// Ширина временного канваса – в 3 раза больше ширины глифа (по субпикселям)
		const charWidth = Math.ceil(glyph.width * 3);
		const charHeight = Math.ceil(glyph.height);
		if (charWidth <= 0 || charHeight <= 0) return;

		tempCanvas.width = charWidth;
		tempCanvas.height = charHeight;
		tempCtx.clearRect(0, 0, charWidth, charHeight);
		tempCtx.font = font;
		tempCtx.fillStyle = '#ffffff';
		tempCtx.textBaseline = 'top';
		// Рисуем символ с началом в (0,0) – относительная система координат
		tempCtx.fillText(char, 0, 0);

		const charImageData = tempCtx.getImageData(0, 0, charWidth, charHeight);
		const charData = charImageData.data;

		for (let y = 0; y < charHeight; y++) {
			// Глобальная вертикальная координата (дробная часть glyph.y учитывается)
			const globalY = glyph.y + y;
			const srcY = Math.floor(globalY);
			if (srcY < 0 || srcY >= imageHeight) continue;

			for (let x = 0; x < charWidth; x++) {
				// Глобальная горизонтальная координата субпикселя (в единицах исходных пикселей)
				const globalX = glyph.x + x / 3;
				const srcX = Math.floor(globalX);
				if (srcX < 0 || srcX >= imageWidth) continue;

				// Определяем, какому субпикселю (R/G/B) соответствует текущий x
				const subpixelIndex = Math.min(2, Math.floor((globalX - srcX) * 3));

				// Альфа из временного канваса (уже содержит сглаживание по вертикали)
				const charAlpha = charData[(y * charWidth + x) * 4 + 3] / 255;
				const active = charAlpha > 0.5;

				// Индекс исходного пикселя
				const srcIndex = (srcY * imageWidth + srcX) * 4;

				let newR = data[srcIndex];
				let newG = data[srcIndex + 1];
				let newB = data[srcIndex + 2];

				if (layer.negative) {
					// Негатив: активный субпиксель выжигаем (0), неактивный остаётся
					if (active) {
						if (subpixelIndex === 0) newR = 0;
						else if (subpixelIndex === 1) newG = 0;
						else newB = 0;
					}
					// Никакой искусственной минимальной яркости
				} else {
					// Обычный: неактивный субпиксель выжигаем, активный остаётся
					if (!active) {
						if (subpixelIndex === 0) newR = 0;
						else if (subpixelIndex === 1) newG = 0;
						else newB = 0;
					}
				}

				data[srcIndex] = newR;
				data[srcIndex + 1] = newG;
				data[srcIndex + 2] = newB;
				// Альфа канал исходного изображения не меняем
			}
		}
	});
}

export const exportImage = (image, layers, glyphs, textSettings) => {
	if (!image) return;

	const canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;
	const ctx = canvas.getContext('2d');

	// Рисуем исходное изображение
	ctx.drawImage(image, 0, 0);
	const baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

	const visibleLayers = layers.filter(l => l.visible);

	// Сначала накладываем градиенты (если есть точки)
	visibleLayers.forEach(layer => {
		if (layer.colorPoints && layer.colorPoints.length > 0) {
			ctx.save();
			fillLayerWithGradient(ctx, layer);
			ctx.restore();
		}
	});

	// Получаем обновлённый ImageData после градиентов
	const finalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

	// Применяем субпиксельный текст для каждого слоя
	visibleLayers.forEach(layer => {
		renderSubpixelText(ctx, layer, glyphs, textSettings, finalImageData);
	});

	// Записываем финальные пиксели обратно
	ctx.putImageData(finalImageData, 0, 0);

	canvas.toBlob((blob) => {
		saveAs(blob, 'exported.png');
	});
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