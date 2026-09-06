// drawUtils.js
export const assignLayerInfoToGlyphs = (glyphs, layers) => {
	const visibleLayers = layers.filter(l => l.visible);
	glyphs.forEach(glyph => {
		const centerX = glyph.x + glyph.width / 2;
		const centerY = glyph.y + glyph.height / 2;
		let topLayer = null;
		// Ищем верхний видимый слой, содержащий центр глифа
		for (let i = visibleLayers.length - 1; i >= 0; i--) {
			if (isPointInLayer(centerX, centerY, visibleLayers[i])) {
				topLayer = visibleLayers[i];
				break;
			}
		}
		// Если слой не найден, negative = null (глиф не будет отрисован)
		glyph.negative = topLayer ? topLayer.negative : null;
	});
};

export const drawLayers = (ctx, layers, activeLayerId, isDraft = false) => {
	layers.forEach(layer => {
		const color = layer.color || '#ff0000';
		ctx.save();
		ctx.globalAlpha = isDraft ? 0.7 : 1;
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.setLineDash([]);

		// Заливаем градиентом, если есть точки
		fillLayerWithGradient(ctx, layer);

		// Рисуем контур области
		if (layer.type === 'rect') {
			ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
		} else if (layer.type === 'ellipse') {
			ctx.beginPath();
			ctx.ellipse(
				layer.x + layer.width / 2,
				layer.y + layer.height / 2,
				layer.width / 2,
				layer.height / 2,
				0, 0, Math.PI * 2
			);
			ctx.stroke();
		} else if (layer.type === 'freehand' && layer.points && layer.points.length > 0) {
			ctx.beginPath();
			ctx.moveTo(layer.points[0].x, layer.points[0].y);
			for (let i = 1; i < layer.points.length; i++) {
				ctx.lineTo(layer.points[i].x, layer.points[i].y);
			}
			ctx.closePath();
			ctx.stroke();
		}

		// Выделение активного слоя — белая пунктирная рамка
		if (layer.id === activeLayerId && !isDraft) {
			ctx.save();
			ctx.globalAlpha = 1;
			ctx.strokeStyle = '#ffffff';
			ctx.lineWidth = 2;
			ctx.setLineDash([5, 3]);
			if (layer.type === 'rect') {
				ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
			} else if (layer.type === 'ellipse') {
				ctx.beginPath();
				ctx.ellipse(
					layer.x + layer.width / 2,
					layer.y + layer.height / 2,
					layer.width / 2,
					layer.height / 2,
					0, 0, Math.PI * 2
				);
				ctx.stroke();
			} else if (layer.type === 'freehand' && layer.points?.length) {
				ctx.beginPath();
				ctx.moveTo(layer.points[0].x, layer.points[0].y);
				for (let i = 1; i < layer.points.length; i++) {
					ctx.lineTo(layer.points[i].x, layer.points[i].y);
				}
				ctx.closePath();
				ctx.stroke();
			}
			ctx.restore();
		}

		// Рисуем точки цвета
		if (layer.colorPoints && layer.colorPoints.length > 0) {
			layer.colorPoints.forEach(p => {
				ctx.beginPath();
				ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
				// Учитываем прозрачность
				ctx.fillStyle = p.color;
				const pointAlpha = p.alpha / 255;
				ctx.globalAlpha = isDraft ? 0.7 * pointAlpha : pointAlpha;
				ctx.fill();
				ctx.globalAlpha = isDraft ? 0.7 : 1;
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 1;
				ctx.stroke();
			});
		}

		ctx.restore();
	});
};

export const isPointInLayer = (x, y, layer) => {
	if (layer.type === 'rect') {
		return x >= layer.x && x <= layer.x + layer.width && y >= layer.y && y <= layer.y + layer.height;
	} else if (layer.type === 'ellipse') {
		const rx = layer.width / 2, ry = layer.height / 2;
		const cx = layer.x + rx, cy = layer.y + ry;
		return ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1;
	} else if (layer.type === 'freehand' && layer.points) {
		// Более точная проверка: лучевой тест (point in polygon)
		let inside = false;
		const pts = layer.points;
		for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
			const xi = pts[i].x, yi = pts[i].y;
			const xj = pts[j].x, yj = pts[j].y;
			const intersect = ((yi > y) !== (yj > y)) &&
				(x < (xj - xi) * (y - yi) / (yj - yi) + xi);
			if (intersect) inside = !inside;
		}
		return inside;
	}
	return false;
};

export const getLayerBounds = (layer) => {
	if (layer.type === 'rect' || layer.type === 'ellipse') {
		return { minX: layer.x, minY: layer.y, maxX: layer.x + layer.width, maxY: layer.y + layer.height };
	} else if (layer.type === 'freehand' && layer.points) {
		const xs = layer.points.map(p => p.x);
		const ys = layer.points.map(p => p.y);
		return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
	}
	return null;
};

export const getRandomColor = () => `hsl(${Math.random() * 360}, 70%, 60%)`;

// Проверка, что прямоугольник (x,y,width,height) полностью внутри слоя
export const isRectInsideLayer = (rect, layer) => {
	const { x, y, width, height } = rect;
	const corners = [
		{ x, y },
		{ x: x + width, y },
		{ x, y: y + height },
		{ x: x + width, y: y + height },
	];
	return corners.every(corner => isPointInLayer(corner.x, corner.y, layer));
};

export const drawAllGlyphs = (ctx, glyphs, layers) => {
	if (!glyphs || glyphs.length === 0) return;

	const visibleLayers = layers.filter(l => l.visible);

	ctx.save();
	glyphs.forEach(g => {
		const centerX = g.x + g.width / 2;
		const centerY = g.y + g.height / 2;

		// Ищем верхний слой, содержащий центр
		let topLayer = null;
		for (let i = visibleLayers.length - 1; i >= 0; i--) {
			const layer = visibleLayers[i];
			if (isPointInLayer(centerX, centerY, layer)) {
				topLayer = layer;
				break;
			}
		}

		if (topLayer) {
			if (topLayer.negative) {
				// Негативный режим: заливка черным, без обводки (симуляция естественного затемнения)
				ctx.fillStyle = '#000000aa';
				ctx.fillRect(g.x, g.y, g.width, g.height);
			} else {
				// Обычный режим: обводка черым, без заливки (симуляция естественного затемнения)
				ctx.strokeStyle = '#000000aa';
				ctx.lineWidth = 1;
				ctx.strokeRect(g.x, g.y, g.width, g.height);
			}
		} else {
			// Не попал в видимый слой: серый контур
			ctx.strokeStyle = 'transparent';
			ctx.lineWidth = 1;
			ctx.strokeRect(g.x, g.y, g.width, g.height);
		}
	});
	ctx.restore();
};

const fillLayerWithGradient = (ctx, layer) => {
	const points = layer.colorPoints;
	if (!points || points.length === 0) return;

	// Сохраняем контекст и обрезаем по форме слоя
	ctx.save();
	if (layer.type === 'rect') {
		ctx.beginPath();
		ctx.rect(layer.x, layer.y, layer.width, layer.height);
	} else if (layer.type === 'ellipse') {
		ctx.beginPath();
		ctx.ellipse(
			layer.x + layer.width / 2,
			layer.y + layer.height / 2,
			layer.width / 2,
			layer.height / 2,
			0, 0, Math.PI * 2
		);
	} else if (layer.type === 'freehand' && layer.points) {
		ctx.beginPath();
		ctx.moveTo(layer.points[0].x, layer.points[0].y);
		for (let i = 1; i < layer.points.length; i++) {
			ctx.lineTo(layer.points[i].x, layer.points[i].y);
		}
		ctx.closePath();
	}
	ctx.clip(); // теперь рисование только внутри области

	if (points.length === 1) {
		const p = points[0];
		ctx.globalAlpha = p.alpha / 255;
		ctx.fillStyle = p.color;
		ctx.fill(); // зальёт область, ограниченную клипом (формой слоя)
	} else {
		// Несколько точек: IDW через попиксельную отрисовку
		const bounds = getLayerBounds(layer);
		if (!bounds) {
			ctx.restore();
			return;
		}
		const { minX, minY, maxX, maxY } = bounds;
		const offscreen = document.createElement('canvas');
		offscreen.width = maxX - minX;
		offscreen.height = maxY - minY;
		const offCtx = offscreen.getContext('2d');
		const imageData = offCtx.createImageData(offscreen.width, offscreen.height);
		const data = imageData.data;

		// Кэш цветов точек в RGB
		const pointRGBs = points.map(p => {
			const hex = p.color.replace('#', '');
			return {
				x: p.x,
				y: p.y,
				r: parseInt(hex.slice(0, 2), 16),
				g: parseInt(hex.slice(2, 4), 16),
				b: parseInt(hex.slice(4, 6), 16),
				a: p.alpha,
			};
		});

		const power = 2; // степень для IDW
		const epsilon = 0.0001;

		for (let y = 0; y < offscreen.height; y++) {
			for (let x = 0; x < offscreen.width; x++) {
				const worldX = x + minX;
				const worldY = y + minY;
				let weightSum = 0;
				let r = 0, g = 0, b = 0, a = 0;

				for (const p of pointRGBs) {
					const dx = worldX - p.x;
					const dy = worldY - p.y;
					const dist = Math.sqrt(dx * dx + dy * dy);
					const w = 1 / Math.pow(dist + epsilon, power);
					weightSum += w;
					r += p.r * w;
					g += p.g * w;
					b += p.b * w;
					a += p.a * w;
				}

				if (weightSum > 0) {
					r /= weightSum;
					g /= weightSum;
					b /= weightSum;
					a /= weightSum;
				} else {
					// если все дистанции нулевые, берём цвет первой точки
					r = pointRGBs[0].r;
					g = pointRGBs[0].g;
					b = pointRGBs[0].b;
					a = pointRGBs[0].a;
				}

				const idx = (y * offscreen.width + x) * 4;
				data[idx] = Math.round(r);
				data[idx + 1] = Math.round(g);
				data[idx + 2] = Math.round(b);
				data[idx + 3] = Math.round(a);
			}
		}

		offCtx.putImageData(imageData, 0, 0);
		ctx.globalAlpha = 1;
		ctx.drawImage(offscreen, minX, minY);
	}

	ctx.restore();
};
export { fillLayerWithGradient };