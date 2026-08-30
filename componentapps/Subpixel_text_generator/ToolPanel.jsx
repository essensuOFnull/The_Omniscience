import React, { useContext } from 'react';
import { Box, List, ListItemButton, ListItemIcon, Tooltip } from '@mui/material';
import NearMeIcon from '@mui/icons-material/NearMe';
import Crop32Icon from '@mui/icons-material/Crop32';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import GestureIcon from '@mui/icons-material/Gesture';
import FunctionsIcon from '@mui/icons-material/Functions';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { AppContext } from './App';

export default function ToolPanel() {
	const { state, dispatch } = useContext(AppContext);

	const tools = [
		{ id: 'select', label: 'Выбор/перемещение', icon: <NearMeIcon /> },
		{ id: 'rect', label: 'Прямоугольник', icon: <Crop32Icon /> },
		{ id: 'ellipse', label: 'Эллипс', icon: <CircleOutlinedIcon /> },
		{ id: 'freehand', label: 'Произвольная', icon: <GestureIcon /> },
		{ id: 'formula', label: 'Формула', icon: <FunctionsIcon /> },
		{ id: 'point', label: 'Точка цвета', icon: <FiberManualRecordIcon /> },
	];

	return (
		<Box sx={{ width: 70, borderRight: 1, borderColor: 'divider' }}>
			<List>
				{tools.map(tool => (
					<Tooltip key={tool.id} title={tool.label} placement="right">
						<ListItemButton
							selected={state.tool === tool.id}
							onClick={() => dispatch({ type: 'SET_TOOL', payload: tool.id })}
							sx={{ justifyContent: 'center', px: 0, py: 1 }}
						>
							<ListItemIcon sx={{ minWidth: 0, justifyContent: 'center' }}>
								{tool.icon}
							</ListItemIcon>
						</ListItemButton>
					</Tooltip>
				))}
			</List>
		</Box>
	);
}