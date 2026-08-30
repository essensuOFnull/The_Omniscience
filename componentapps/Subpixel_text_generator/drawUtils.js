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
				ctx.fillStyle = p.color + (p.alpha < 1 ? Math.round(p.alpha * 255).toString(16).padStart(2, '0') : '');
				ctx.fill();
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
		// Грубая проверка: ограничивающий прямоугольник
		const xs = layer.points.map(p => p.x);
		const ys = layer.points.map(p => p.y);
		const minX = Math.min(...xs), maxX = Math.max(...xs);
		const minY = Math.min(...ys), maxY = Math.max(...ys);
		return x >= minX && x <= maxX && y >= minY && y <= maxY;
	}
	return false;
};

export const getRandomColor = () => `hsl(${Math.random() * 360}, 70%, 60%)`;