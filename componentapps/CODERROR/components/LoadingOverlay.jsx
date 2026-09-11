import React from 'react';
import { CircularProgress } from '@mui/material';

export default function LoadingOverlay() {
	return (
		<div
			style={{
				position: 'fixed',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -50%)',
				zIndex: 20,
			}}
		>
			<CircularProgress size={`min(80vw, 80vh)`} sx={{ color: '#f0f' }} />
		</div>
	);
}