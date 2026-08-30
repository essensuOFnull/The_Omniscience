import { getRandomColor } from './drawUtils'; // если нужно для дефолтного цвета

export const initialState = {
	image: null,
	imageName: '',
	layers: [],
	activeLayerId: null,
	showAllLayers: true,
	tool: 'select', // теперь по умолчанию инструмент выбора
	isDrawing: false,
	draft: null,
	currentColor: { hex: '#ff0000', alpha: 1 }, // текущий цвет для точек
};

export function reducer(state, action) {
	switch (action.type) {
		case 'SET_IMAGE':
			return { ...state, image: action.payload.image, imageName: action.payload.name, layers: [], activeLayerId: null };
		case 'SET_TOOL':
			return { ...state, tool: action.payload };
		case 'SET_DRAWING':
			return { ...state, isDrawing: action.payload };
		case 'ADD_LAYER': {
			const layer = { ...action.payload, id: crypto.randomUUID(), colorPoints: [] };
			return { ...state, layers: [...state.layers, layer], activeLayerId: layer.id };
		}
		case 'SET_ACTIVE_LAYER':
			return { ...state, activeLayerId: action.payload };
		case 'TOGGLE_LAYER_VISIBILITY': {
			const layers = state.layers.map(l => l.id === action.payload ? { ...l, visible: !l.visible } : l);
			return { ...state, layers };
		}
		case 'DELETE_LAYER': {
			const layers = state.layers.filter(l => l.id !== action.payload);
			const activeLayerId = state.activeLayerId === action.payload ? null : state.activeLayerId;
			return { ...state, layers, activeLayerId };
		}
		case 'TOGGLE_SHOW_ALL':
			return { ...state, showAllLayers: action.payload };
		case 'REORDER_LAYERS': {
			const { activeId, overId } = action.payload;
			const oldIndex = state.layers.findIndex(l => l.id === activeId);
			const newIndex = state.layers.findIndex(l => l.id === overId);
			if (oldIndex === -1 || newIndex === -1) return state;
			const layers = [...state.layers];
			const [moved] = layers.splice(oldIndex, 1);
			layers.splice(newIndex, 0, moved);
			return { ...state, layers };
		}
		case 'LOAD_PROJECT': {
			const newLayers = action.payload.layers.map(l => ({
				...l,
				id: crypto.randomUUID(),
				colorPoints: l.colorPoints ? l.colorPoints.map(p => ({ ...p, id: crypto.randomUUID() })) : [],
			}));
			return {
				...state,
				image: action.payload.image,
				layers: newLayers,
				activeLayerId: null, // сбрасываем, чтобы избежать несоответствий
				showAllLayers: action.payload.showAllLayers ?? true,
			};
		}
		case 'UPDATE_LAYER': {
			const updatedLayer = action.payload;
			const layers = state.layers.map(l => l.id === updatedLayer.id ? updatedLayer : l);
			return { ...state, layers };
		}
		case 'SET_CURRENT_COLOR':
			return { ...state, currentColor: action.payload };
		case 'ADD_COLOR_POINT': {
			const { layerId, point } = action.payload;
			const layers = state.layers.map(l =>
				l.id === layerId ? { ...l, colorPoints: [...(l.colorPoints || []), point] } : l
			);
			return { ...state, layers };
		}
		case 'UPDATE_COLOR_POINT': {
			const { layerId, pointId, updates } = action.payload;
			const layers = state.layers.map(l => {
				if (l.id !== layerId) return l;
				const colorPoints = (l.colorPoints || []).map(p =>
					p.id === pointId ? { ...p, ...updates } : p
				);
				return { ...l, colorPoints };
			});
			return { ...state, layers };
		}
		case 'DELETE_COLOR_POINT': {
			const { layerId, pointId } = action.payload;
			const layers = state.layers.map(l =>
				l.id === layerId ? { ...l, colorPoints: (l.colorPoints || []).filter(p => p.id !== pointId) } : l
			);
			return { ...state, layers };
		}
		default:
			return state;
	}
}