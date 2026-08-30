import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import LayersPanel from './LayersPanel';
import ColorPickerPanel from './ColorPickerPanel';

export default function RightPanel() {
	const [tab, setTab] = useState(0);

	return (
		<Box sx={{ width: 280, borderLeft: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
			<Tabs value={tab} onChange={(e, v) => setTab(v)} variant="fullWidth">
				<Tab label="Слои" />
				<Tab label="Цвет" />
			</Tabs>
			<Box sx={{ flex: 1, overflow: 'auto' }}>
				{tab === 0 ? <LayersPanel /> : <ColorPickerPanel />}
			</Box>
		</Box>
	);
}