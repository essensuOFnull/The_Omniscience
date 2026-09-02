import React, { useContext, useRef, useEffect } from 'react';
import { AppBar, Toolbar, Button, IconButton, Box, TextField, Select, MenuItem, Typography } from '@mui/material';
import { AppContext } from './App';
import { importImage, exportImage, saveProject, openProject } from './fileUtils';
import { calculateGlyphs } from './glyphUtils';

export default function TopBar() {
	const { state, dispatch } = useContext(AppContext);
	const fileInputRef = useRef(null);

	const handleImportClick = () => fileInputRef.current.click();
	const handleFileChange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		await importImage(file, dispatch);
	};

	// Обновляем глифы при изменении текста/шрифта/размера/направления или изображения
	useEffect(() => {
		if (state.image && state.textSettings) {
			const glyphs = calculateGlyphs(state.image.width, state.image.height, state.textSettings);
			dispatch({ type: 'SET_GLYPHS', payload: glyphs });
		}
	}, [state.image, state.textSettings, dispatch]);

	const updateTextSettings = (key, value) => {
		dispatch({ type: 'SET_TEXT_SETTINGS', payload: { [key]: value } });
	};

	return (
		<AppBar position="static" color="default">
			<Toolbar variant="dense">
				<Button onClick={handleImportClick}>Импорт</Button>
				<input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
				<Button onClick={() => exportImage(state.image, state.layers, state.glyphs, state.textSettings)}>Экспорт PNG</Button>
				<Button onClick={() => saveProject(state)}>Сохранить .stg</Button>
				<Button onClick={() => openProject(dispatch)}>Открыть .stg</Button>

				<Box sx={{ flexGrow: 1 }} />

				<TextField
					size="small"
					label="Текст"
					value={state.textSettings.text}
					onChange={(e) => updateTextSettings('text', e.target.value)}
					sx={{ width: 200, mr: 1 }}
				/>
				<Select
					size="small"
					value={state.textSettings.fontFamily}
					onChange={(e) => updateTextSettings('fontFamily', e.target.value)}
					sx={{ width: 120, mr: 1 }}
				>
					<MenuItem value="Arial">Arial</MenuItem>
					<MenuItem value="Times New Roman">Times New Roman</MenuItem>
					<MenuItem value="Courier New">Courier New</MenuItem>
					<MenuItem value="Georgia">Georgia</MenuItem>
				</Select>
				<TextField
					size="small"
					label="Размер"
					type="number"
					value={state.textSettings.fontSize}
					onChange={(e) => updateTextSettings('fontSize', Number(e.target.value))}
					sx={{ width: 80, mr: 1 }}
				/>
				<Select
					size="small"
					value={state.textSettings.direction}
					onChange={(e) => updateTextSettings('direction', e.target.value)}
					sx={{ width: 150 }}
				>
					<MenuItem value="ltr">Слева направо</MenuItem>
					<MenuItem value="rtl">Справа налево</MenuItem>
					<MenuItem value="ttb">Сверху вниз</MenuItem>
					<MenuItem value="btt">Снизу вверх</MenuItem>
				</Select>
			</Toolbar>
		</AppBar>
	);
}