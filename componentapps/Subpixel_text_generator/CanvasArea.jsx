import React, { useRef, useEffect, useContext } from 'react';
import { Box } from '@mui/material';
import { AppContext } from './App';
import { drawLayers, getRandomColor, isPointInLayer, drawAllGlyphs } from './drawUtils';

export default function CanvasArea() {
	const { state, dispatch } = useContext(AppContext);
	const containerRef = useRef(null);
	const canvasRef = useRef(null);
	const drawingRef = useRef(null); // текущее временное выделение
	const moveDataRef = useRef(null); // { type, layerId?, pointId?, startX, startY, original? }
	const snappingRef = useRef(null); // подсветка привязки для точки

	// Функция для генерации уникального id с fallback
	const generateId = () => {
		if (typeof crypto !== 'undefined' && crypto.randomUUID) {
			return crypto.randomUUID();
		}
		return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
	};

	// Рисуем всё на canvas
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !state.image) return;
		const ctx = canvas.getContext('2d');
		canvas.width = state.image.width;
		canvas.height = state.image.height;
		ctx.drawImage(state.image, 0, 0);

		const visibleLayers = state.showAllLayers
			? state.layers.filter(l => l.visible)
			: state.layers.filter(l => l.id === state.activeLayerId && l.visible);

		// Рисуем контуры и точки
		drawLayers(ctx, visibleLayers, state.activeLayerId);

		// Рисуем знакоместа
		drawAllGlyphs(ctx, state.glyphs, visibleLayers);

		if (drawingRef.current) {
			drawLayers(ctx, [drawingRef.current], null, true);
		}
	}, [state.image, state.layers, state.activeLayerId, state.showAllLayers, state.glyphs]);

	// Обработчики мыши
	const getCanvasCoords = (e) => {
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	};

	const getClampedCoords = (e) => {
		const { x, y } = getCanvasCoords(e);
		return {
			x: Math.max(0, Math.min(state.image.width, x)),
			y: Math.max(0, Math.min(state.image.height, y)),
		};
	};

	const findLayerAtPoint = (x, y) => {
		for (let i = state.layers.length - 1; i >= 0; i--) {
			const layer = state.layers[i];
			if (isPointInLayer(x, y, layer)) return layer;
		}
		return null;
	};

	// Найти точку под координатами
	const findColorPointAt = (x, y) => {
		for (let i = state.layers.length - 1; i >= 0; i--) {
			const layer = state.layers[i];
			if (layer.colorPoints) {
				for (const p of layer.colorPoints) {
					const dx = p.x - x, dy = p.y - y;
					if (Math.sqrt(dx * dx + dy * dy) <= 6) { // чуть увеличили радиус захвата
						return { layer, point: p };
					}
				}
			}
		}
		return null;
	};

	const getLayerBounds = (layer) => {
		if (layer.type === 'rect' || layer.type === 'ellipse') {
			return { minX: layer.x, minY: layer.y, maxX: layer.x + layer.width, maxY: layer.y + layer.height };
		} else if (layer.type === 'freehand' && layer.points) {
			const xs = layer.points.map(p => p.x);
			const ys = layer.points.map(p => p.y);
			return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
		}
		return null;
	};

	// Примагничивание для точки: возвращает скорректированные координаты
	const snapPoint = (x, y, layer) => {
		const bounds = getLayerBounds(layer);
		if (!bounds) return { x, y };
		const { minX, minY, maxX, maxY } = bounds;
		const specialPoints = [
			{ x: minX, y: minY }, { x: maxX, y: minY },
			{ x: minX, y: maxY }, { x: maxX, y: maxY },
			{ x: (minX + maxX) / 2, y: minY }, { x: (minX + maxX) / 2, y: maxY },
			{ x: minX, y: (minY + maxY) / 2 }, { x: maxX, y: (minY + maxY) / 2 },
			{ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
		];
		const threshold = 10;
		let best = null, bestDist = threshold;
		for (const sp of specialPoints) {
			const dist = Math.hypot(sp.x - x, sp.y - y);
			if (dist < bestDist) {
				bestDist = dist;
				best = sp;
			}
		}
		return best ? { x: best.x, y: best.y } : { x, y };
	};

	const handleMouseDown = (e) => {
		if (!state.image) return;
		const { x, y } = getClampedCoords(e);

		if (state.tool === 'select') {
			// Проверяем, попали ли в точку цвета
			const foundPoint = findColorPointAt(x, y);
			if (foundPoint) {
				dispatch({ type: 'SET_ACTIVE_LAYER', payload: foundPoint.layer.id });
				moveDataRef.current = {
					type: 'point',
					layerId: foundPoint.layer.id,
					pointId: foundPoint.point.id,
					startX: x,
					startY: y,
					originalPoint: { ...foundPoint.point },
				};
				dispatch({ type: 'SET_DRAWING', payload: true });
				e.preventDefault();
				return;
			}
			// Иначе перемещаем слой
			const layer = findLayerAtPoint(x, y);
			if (layer) {
				dispatch({ type: 'SET_ACTIVE_LAYER', payload: layer.id });
				moveDataRef.current = {
					type: 'layer',
					layerId: layer.id,
					startX: x,
					startY: y,
					originalLayer: JSON.parse(JSON.stringify(layer)), // глубокая копия, включая colorPoints
				};
				dispatch({ type: 'SET_DRAWING', payload: true });
				e.preventDefault();
				return;
			}
			return;
		}

		if (state.tool === 'point') {
			// Находим слой, куда добавляем точку
			const layer = findLayerAtPoint(x, y);
			if (!layer) return;
			// Примагничиваем координаты
			const snapped = snapPoint(x, y, layer);
			const newPoint = {
				id: generateId(),
				x: snapped.x,
				y: snapped.y,
				color: state.currentColor.hex,
				alpha: state.currentColor.alpha,
			};
			dispatch({ type: 'ADD_COLOR_POINT', payload: { layerId: layer.id, point: newPoint } });
			dispatch({ type: 'SET_ACTIVE_LAYER', payload: layer.id });
			return;
		} else if (state.tool === 'rect' || state.tool === 'ellipse') {
			drawingRef.current = { type: state.tool, x, y, width: 0, height: 0, startX: x, startY: y };
		} else if (state.tool === 'freehand') {
			drawingRef.current = { type: 'freehand', points: [{ x, y }] };
		}
		dispatch({ type: 'SET_DRAWING', payload: true });
	};

	const handleMouseMove = (e) => {
		// Перемещение точек/слоёв
		if (moveDataRef.current) {
			const { x, y } = getClampedCoords(e);
			const dx = x - moveDataRef.current.startX;
			const dy = y - moveDataRef.current.startY;

			if (moveDataRef.current.type === 'point') {
				const { layerId, pointId, originalPoint } = moveDataRef.current;
				// Можно добавить примагничивание при перемещении, если нужно
				dispatch({
					type: 'UPDATE_COLOR_POINT',
					payload: {
						layerId,
						pointId,
						updates: { x: originalPoint.x + dx, y: originalPoint.y + dy },
					},
				});
			} else if (moveDataRef.current.type === 'layer') {
				const { layerId, originalLayer } = moveDataRef.current;
				let updatedLayer;
				if (originalLayer.type === 'rect' || originalLayer.type === 'ellipse') {
					updatedLayer = { ...originalLayer, x: originalLayer.x + dx, y: originalLayer.y + dy };
				} else if (originalLayer.type === 'freehand' && originalLayer.points) {
					updatedLayer = {
						...originalLayer,
						points: originalLayer.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
					};
				}
				// Сдвигаем все colorPoints вместе со слоем
				if (updatedLayer && originalLayer.colorPoints) {
					updatedLayer.colorPoints = originalLayer.colorPoints.map(p => ({
						...p,
						x: p.x + dx,
						y: p.y + dy,
					}));
				}
				if (updatedLayer) {
					dispatch({ type: 'UPDATE_LAYER', payload: updatedLayer });
				}
			}
			return;
		}

		if (!drawingRef.current) return;
		const { x, y } = getClampedCoords(e);
		if (drawingRef.current.type === 'rect' || drawingRef.current.type === 'ellipse') {
			const startX = drawingRef.current.startX;
			const startY = drawingRef.current.startY;
			let width = Math.abs(x - startX);
			let height = Math.abs(y - startY);

			if (e.shiftKey) {
				const maxSide = Math.max(width, height);
				width = maxSide;
				height = maxSide;
			}

			const newX = x < startX ? startX - width : startX;
			const newY = y < startY ? startY - height : startY;

			drawingRef.current = {
				...drawingRef.current,
				x: newX,
				y: newY,
				width,
				height,
			};
		} else if (drawingRef.current.type === 'freehand') {
			drawingRef.current.points.push({ x, y });
		}
		// Перерисовываем canvas с черновиком
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(state.image, 0, 0);
		const layersToDraw = state.showAllLayers
			? state.layers.filter(l => l.visible)
			: state.layers.filter(l => l.id === state.activeLayerId && l.visible);
		drawLayers(ctx, layersToDraw, state.activeLayerId);
		if (drawingRef.current) {
			drawLayers(ctx, [drawingRef.current], null, true);
		}
	};

	const handleMouseUp = (e) => {
		if (moveDataRef.current) {
			moveDataRef.current = null;
			dispatch({ type: 'SET_DRAWING', payload: false });
			return;
		}
		if (!drawingRef.current) return;
		const draft = drawingRef.current;
		drawingRef.current = null;

		if (draft.type === 'rect' || draft.type === 'ellipse') {
			if (draft.width > 2 && draft.height > 2) {
				const { startX, startY, ...cleanDraft } = draft;
				dispatch({ type: 'ADD_LAYER', payload: { ...cleanDraft, visible: true, color: getRandomColor() } });
			}
		} else if (draft.type === 'freehand') {
			if (draft.points.length > 2) {
				const { startX, startY, ...cleanDraft } = draft;
				dispatch({ type: 'ADD_LAYER', payload: { ...cleanDraft, visible: true, color: getRandomColor() } });
			}
		}
		dispatch({ type: 'SET_DRAWING', payload: false });
		// Немедленно перерисовываем без черновика
		redrawCanvas();
	};

	const handleClick = (e) => {
		// Клик по холсту без рисования – проверка попадания в слой
		if (state.isDrawing) return;
		const { x, y } = getClampedCoords(e);
		// Проверяем слои в обратном порядке (верхние первыми)
		for (let i = state.layers.length - 1; i >= 0; i--) {
			const layer = state.layers[i];
			if (isPointInLayer(x, y, layer)) {
				dispatch({ type: 'SET_ACTIVE_LAYER', payload: layer.id });
				break;
			}
		}
	};

	const redrawCanvas = (layers = state.layers, activeLayerId = state.activeLayerId, showAll = state.showAllLayers) => {
		const canvas = canvasRef.current;
		if (!canvas || !state.image) return;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(state.image, 0, 0);
		const layersToDraw = showAll
			? layers.filter(l => l.visible)
			: layers.filter(l => l.id === activeLayerId && l.visible);
		drawLayers(ctx, layersToDraw, activeLayerId, false);
		drawAllGlyphs(ctx, state.glyphs, layersToDraw);
	};

	return (
		<Box sx={{ flex: 1, overflow: 'scroll', bgcolor: 'background.paper', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
			<Box sx={{ padding: '50px', display: 'block', minWidth: 'fit-content', minHeight: 'fit-content' }}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onClick={handleClick}
			>
				{state.image ? (
					<canvas ref={canvasRef} style={{ cursor: state.tool === 'select' ? 'default' : 'crosshair', display: 'block' }} />
				) : (
					<Box sx={{ color: 'text.secondary' }}>Импортируйте изображение</Box>
				)}
			</Box>
		</Box>
	);
}