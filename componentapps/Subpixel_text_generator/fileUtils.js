import JSZip from 'jszip';
import { drawLayers, drawAllGlyphs, getLayerBounds, isPointInLayer, fillLayerWithGradient } from './drawUtils';
import { saveAs } from 'file-saver';

// Вспомогательная функция: получить символ по глифу и тексту
function getCharFromGlyph(glyph, text) {
	if (!text) return '';
	return text[glyph.index % text.length];
}

// Рендеринг субпиксельного текста для слоя
// renderSubpixelText (внутри exportImage)
function renderSubpixelText(ctx, layer, glyphs, textSettings, imageData) {
	const { text, fontFamily, fontSize, widthScale, lineHeightMultiplier } = textSettings;
	if (!text || !fontFamily || !fontSize || !glyphs || glyphs.length === 0) return;

	const font = `${fontSize}px ${fontFamily}`;
	const tempCanvas = document.createElement('canvas');
	const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

	glyphs.forEach(glyph => {
		const centerX = glyph.x + glyph.width / 2;
		const centerY = glyph.y + glyph.height / 2;
		if (!isPointInLayer(centerX, centerY, layer)) return;

		const char = getCharFromGlyph(glyph, text);
		if (!char || glyph.width <= 0 || glyph.height <= 0) return;

		// Ширина временного холста = ширина глифа * 3 (для субпикселей)
		const tempWidth = Math.ceil(glyph.width * 3);
		const tempHeight = Math.ceil(glyph.height);
		tempCanvas.width = tempWidth;
		tempCanvas.height = tempHeight;

		tempCtx.setTransform(1, 0, 0, 1, 0, 0);
		tempCtx.clearRect(0, 0, tempWidth, tempHeight);
		tempCtx.font = font;
		tempCtx.textBaseline = 'top';
		tempCtx.fillStyle = 'rgba(255, 255, 255, 1)';

		// Точное измерение ширины символа в исходном масштабе
		const originalCharWidth = tempCtx.measureText(char).width;
		// Масштаб, чтобы символ занял ровно glyph.width * 3 пикселей
		const scaleX = (glyph.width * 3) / originalCharWidth;
		tempCtx.setTransform(scaleX, 0, 0, 1, 0, 0);
		tempCtx.fillText(char, 0, 0);

		const charImageData = tempCtx.getImageData(0, 0, tempWidth, tempHeight);
		const data = charImageData.data;

		for (let row = 0; row < tempHeight; row++) {
			const srcY = Math.floor(glyph.y) + row;
			if (srcY < 0 || srcY >= imageData.height) continue;

			for (let col = 0; col < glyph.width; col++) {
				const srcX = Math.floor(glyph.x) + col;
				if (srcX < 0 || srcX >= imageData.width) continue;
				if (!isPointInLayer(srcX + 0.5, srcY + 0.5, layer)) continue;

				const subX = col * 3;
				const dataIndex = (srcY * imageData.width + srcX) * 4;

				const alphaR = data[(row * tempWidth + subX) * 4 + 3] / 255;
				const alphaG = data[(row * tempWidth + subX + 1) * 4 + 3] / 255;
				const alphaB = data[(row * tempWidth + subX + 2) * 4 + 3] / 255;

				if (layer.negative) {
					imageData.data[dataIndex] *= alphaR;
					imageData.data[dataIndex + 1] *= alphaG;
					imageData.data[dataIndex + 2] *= alphaB;
				} else {
					imageData.data[dataIndex] *= (1 - alphaR);
					imageData.data[dataIndex + 1] *= (1 - alphaG);
					imageData.data[dataIndex + 2] *= (1 - alphaB);
				}
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