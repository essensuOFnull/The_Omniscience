import React, { useContext } from 'react';
import {
	Box,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	IconButton,
	Checkbox,
	Tooltip,
	Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import { AppContext } from './App';
import {
	DndContext,
	closestCenter,
	PointerSensor,
	KeyboardSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Миниатюра слоя (SVG)
function LayerThumbnail({ layer }) {
	const w = 40, h = 30;
	const patternId = `hatch-${layer.id}`;
	return (
		<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
			<defs>
				<pattern id={patternId} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
					<rect width="4" height="4" fill="none" stroke={layer.color} strokeWidth="1" />
				</pattern>
			</defs>
			<rect x="1" y="1" width={w - 2} height={h - 2} fill="white" fillOpacity="0.2" stroke="gray" />
			{layer.type === 'rect' && <rect x="5" y="5" width={w - 10} height={h - 10} fill={`url(#${patternId})`} />}
			{layer.type === 'ellipse' && (
				<ellipse cx={w / 2} cy={h / 2} rx={w / 3} ry={h / 3} fill={`url(#${patternId})`} />
			)}
			{layer.type === 'freehand' && (
				<path d="M5,20 Q15,5 25,15 T35,10" fill="none" stroke={`url(#${patternId})`} strokeWidth="3" />
			)}
			{layer.type === 'formula' && <text x="20" y="20" fontSize="10" fill={layer.color}>f(x)</text>}
		</svg>
	);
}

// Перетаскиваемый элемент списка
function SortableLayer({ layer, index }) {
	const { state, dispatch } = useContext(AppContext);
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: layer.id });

	const isActive = state.activeLayerId === layer.id;

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<ListItem
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			secondaryAction={
				<Box sx={{ display: 'flex', alignItems: 'center' }}>
					<Tooltip title={layer.visible ? 'Скрыть слой' : 'Показать слой'}>
						<IconButton
							edge="end"
							size="small"
							onClick={(e) => {
								e.stopPropagation();
								dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: layer.id });
							}}
						>
							{layer.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
						</IconButton>
					</Tooltip>
					<Tooltip title="Удалить слой">
						<IconButton
							edge="end"
							size="small"
							onClick={(e) => {
								e.stopPropagation();
								dispatch({ type: 'DELETE_LAYER', payload: layer.id });
							}}
						>
							<DeleteIcon />
						</IconButton>
					</Tooltip>
				</Box>
			}
			onClick={() => dispatch({ type: 'SET_ACTIVE_LAYER', payload: layer.id })}
			sx={{
				bgcolor: isActive ? 'action.selected' : 'transparent',
				borderLeft: isActive ? '3px solid' : '3px solid transparent',
				borderColor: isActive ? 'primary.main' : 'transparent',
				'&:hover': { bgcolor: 'action.hover' },
				cursor: 'pointer',
				pr: 10, // чтобы иконки не перекрывали текст
			}}
		>
			<ListItemIcon sx={{ minWidth: 40 }}>
				<LayerThumbnail layer={layer} />
			</ListItemIcon>
			<ListItemText
				primary={`Слой ${index + 1}`}
				secondary={`${layer.type === 'freehand' ? 'произвольная' : layer.type === 'ellipse' ? 'эллипс' : layer.type === 'rect' ? 'прямоугольник' : layer.type}, • точек: ${layer.colorPoints.length}`}
				primaryTypographyProps={{ variant: 'body2' }}
				secondaryTypographyProps={{ variant: 'caption' }}
			/>
		</ListItem>
	);
}

export default function LayersPanel() {
	const { state, dispatch } = useContext(AppContext);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 }, // чтобы клики не путались с перетаскиванием
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const handleDragEnd = ({ active, over }) => {
		if (active.id !== over?.id) {
			dispatch({
				type: 'REORDER_LAYERS',
				payload: { activeId: active.id, overId: over.id },
			});
		}
	};

	return (
		<Box
			sx={{
				width: 260,
				borderLeft: 1,
				borderColor: 'divider',
				display: 'flex',
				flexDirection: 'column',
				bgcolor: 'background.paper',
			}}
		>
			<Box
				sx={{
					p: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					borderBottom: 1,
					borderColor: 'divider',
				}}
			>
				<Typography variant="subtitle2">Слои выделений</Typography>
				<Tooltip title="Показывать все видимые слои на холсте">
					<Checkbox
						checked={state.showAllLayers}
						onChange={(e) => dispatch({ type: 'TOGGLE_SHOW_ALL', payload: e.target.checked })}
						size="small"
					/>
				</Tooltip>
			</Box>

			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={state.layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
					<List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
						{state.layers.map((layer, index) => (
							<SortableLayer
								key={layer.id}
								layer={layer}
								index={index}
							/>
						))}
						{state.layers.length === 0 && (
							<Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
								Нет слоёв
							</Box>
						)}
					</List>
				</SortableContext>
			</DndContext>
		</Box>
	);
}