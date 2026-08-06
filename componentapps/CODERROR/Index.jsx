import React from 'react';
import ReactDOM from 'react-dom/client';
import { CircularProgress } from '@mui/material';

(async () => {
	const root = ReactDOM.createRoot(document.getElementById('root'));
	root.render(
		<CircularProgress
			id="loading"
			size="min(100vw,100vh)"
			sx={{
				position: 'fixed',
				display: 'block',
				left: 'calc(calc(100vw - min(100vw, 100vh)) / 2)',
				top: 'calc(calc(100vh - min(100vw, 100vh)) / 2)',
				color: '#f0f',
			}}
		/>
	);
})();