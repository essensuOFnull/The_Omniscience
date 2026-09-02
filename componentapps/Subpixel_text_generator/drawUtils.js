// drawUtils.js
export const drawLayers = (ctx, layers, activeLayerId, isDraft = false) => {
	layers.forEach(layer => {
		const color = layer.color || '#ff0000';
		ctx.save();
		ctx.globalAlpha = isDraft ? 0.7 : 1;
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.setLineDash([]);

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
				ctx.globalAlpha = isDraft ? 0.7 * p.alpha : p.alpha;
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