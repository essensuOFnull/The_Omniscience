import React, { useReducer, useEffect, useContext, createContext } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import TopBar from './TopBar';
import ToolPanel from './ToolPanel';
import CanvasArea from './CanvasArea';
import RightPanel from './RightPanel';
import { reducer, initialState } from './state';
import { getRandomColor } from './drawUtils';

const AppContext = createContext();

const theme = createTheme({
	palette: {
		mode: 'dark',
	},
});

export default function App() {
	const [state, dispatch] = useReducer(reducer, initialState);

	// Глобальная обработка Ctrl+A
	useEffect(() => {
		const handleKeyDown = (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
				e.preventDefault();
				if (state.image) {
					dispatch({
						type: 'ADD_LAYER',
						payload: {
							type: 'rect',
							x: 0,
							y: 0,
							width: state.image.width,
							height: state.image.height,
							visible: true,
							color: getRandomColor(),
							colorPoints: [],
						},
					});
				}
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [state.image, dispatch]);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<AppContext.Provider value={{ state, dispatch }}>
				<Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
					<TopBar />
					<Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
						<ToolPanel />
						<CanvasArea />
						<RightPanel />
					</Box>
				</Box>
			</AppContext.Provider>
		</ThemeProvider>
	);
}

export { AppContext };