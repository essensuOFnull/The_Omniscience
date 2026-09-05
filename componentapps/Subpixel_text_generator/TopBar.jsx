import React, { useContext, useRef, useEffect, useMemo } from 'react';
import { AppBar, Toolbar, Button, IconButton, Box, TextField, MenuItem, Typography } from '@mui/material';
import { AppContext } from './App';
import { importImage, exportImage, saveProject, openProject, createGlyphAtlas } from './fileUtils';
import { calculateGlyphs } from './glyphUtils';

export default function TopBar() {
	const { state, dispatch } = useContext(AppContext);
	const fileInputRef = useRef(null);
	const fontInputRef = useRef(null);

	const handleImportClick = () => fileInputRef.current.click();
	const handleFileChange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		await importImage(file, dispatch);
	};

	// Загрузка шрифта
	const handleFontFileChange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		await loadFontFromFile(file);
	};

	const loadFontFromFile = async (file) => {
		try {
			const allowedExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
			const ext = '.' + file.name.split('.').pop().toLowerCase();
			if (!allowedExtensions.includes(ext)) {
				alert('Поддерживаются только TTF, OTF, WOFF, WOFF2');
				return;
			}

			const arrayBuffer = await file.arrayBuffer();

			// Безопасное уникальное имя
			const baseName = file.name.replace(/\.[^/.]+$/, '');
			const safeName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
			const fontName = `CustomFont_${Date.now()}_${safeName}`;

			// Удаляем старый шрифт с таким же именем (если есть)
			for (const existingFont of document.fonts) {
				if (existingFont.family === fontName) {
					document.fonts.delete(existingFont);
				}
			}

			const font = new FontFace(fontName, arrayBuffer);
			await font.load();
			document.fonts.add(font);

			// Убеждаемся, что шрифт готов к использованию
			await document.fonts.load(`16px "${fontName}"`);

			dispatch({
				type: 'SET_TEXT_SETTINGS',
				payload: { fontFamily: fontName },
			});

			console.log(`Шрифт "${fontName}" загружен`);
		} catch (err) {
			console.error('Ошибка загрузки шрифта:', err);
			alert('Не удалось загрузить шрифт. Проверьте файл.');
		}
	};

	// Обработчики drag-and-drop для шрифта
	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleDrop = async (e) => {
		e.preventDefault();
		const files = e.dataTransfer.files;
		if (files.length > 0) {
			const file = files[0];
			// Проверяем расширение
			const ext = '.' + file.name.split('.').pop().toLowerCase();
			if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
				await loadFontFromFile(file);
			}
		}
	};

	const glyphAtlas = useMemo(() => {
		if (!state.textSettings.text) return {};
		return createGlyphAtlas(
			state.textSettings.text,
			state.textSettings.fontFamily,
			state.textSettings.fontSize,
			state.textSettings.widthScale
		);
	}, [state.textSettings.text, state.textSettings.fontFamily, state.textSettings.fontSize, state.textSettings.widthScale]);

	useEffect(() => {
		if (state.image && glyphAtlas && Object.keys(glyphAtlas).length > 0) {
			const newGlyphs = calculateGlyphs(
				state.image.width,
				state.image.height,
				state.textSettings,
				glyphAtlas
			);
			dispatch({ type: 'SET_GLYPHS', payload: newGlyphs });
		} else if (state.image) {
			dispatch({ type: 'SET_GLYPHS', payload: [] });
		}
	}, [state.image, state.textSettings, glyphAtlas, dispatch]);

	const updateTextSettings = (key, value) => {
		dispatch({ type: 'SET_TEXT_SETTINGS', payload: { [key]: value } });
	};

	return (
		<AppBar position="static" color="default" onDragOver={handleDragOver} onDrop={handleDrop}>
			<Toolbar variant="dense" sx={{ justifyContent: 'space-evenly' }}>
				{/* Кнопка загрузки шрифта */}
				<Button onClick={() => fontInputRef.current.click()} sx={{ mr: 1, flex: 1, maxWidth: 'max-content' }}>
					Импорт шрифта
				</Button>
				<input
					ref={fontInputRef}
					type="file"
					accept=".ttf,.otf,.woff,.woff2"
					style={{ display: 'none' }}
					onChange={handleFontFileChange}
				/>
				<Button onClick={handleImportClick} sx={{ flex: 1, maxWidth: 'max-content' }}>Импорт изображения</Button>
				<Button onClick={() => openProject(dispatch)} sx={{ flex: 1, maxWidth: 'max-content' }}>Импорт .stg</Button>
				<input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none', flex: 1, maxWidth: 'max-content' }} onChange={handleFileChange} />
				<Button
					onClick={() => exportImage(state.image, state.layers, state.glyphs, state.textSettings, glyphAtlas)}
					sx={{ flex: 1, maxWidth: 'max-content' }}
				>
					Экспорт .png
				</Button>
				<Button onClick={() => saveProject(state)} sx={{ flex: 1, maxWidth: 'max-content' }}>Экспорт .stg</Button>
			</Toolbar>
			<Toolbar variant="dense" sx={{ justifyContent: 'space-evenly' }}>
				<TextField
					size="small"
					label="Текст"
					value={state.textSettings.text}
					onChange={(e) => updateTextSettings('text', e.target.value)}
					sx={{ mr: 1, flex: 1, maxWidth: 'max-content' }}
				/>
				<TextField
					select
					size="small"
					label="Шрифт"
					value={state.textSettings.fontFamily}
					onChange={(e) => updateTextSettings('fontFamily', e.target.value)}
					sx={{ mr: 1, flex: 1, maxWidth: 'max-content' }}
				>
					{/* Стандартные шрифты */}
					<MenuItem value="Arial">Arial</MenuItem>
					<MenuItem value="Times New Roman">Times New Roman</MenuItem>
					<MenuItem value="Courier New">Courier New</MenuItem>
					<MenuItem value="Georgia">Georgia</MenuItem>
					{/* Если загружен пользовательский шрифт, покажем его */}
					{state.textSettings.fontFamily &&
						!['Arial', 'Times New Roman', 'Courier New', 'Georgia'].includes(state.textSettings.fontFamily) && (
							<MenuItem value={state.textSettings.fontFamily}>
								{state.textSettings.fontFamily} (пользовательский)
							</MenuItem>
						)}
				</TextField>
				<TextField
					size="small"
					label="Размер"
					type="number"
					value={state.textSettings.fontSize}
					onChange={(e) => updateTextSettings('fontSize', Number(e.target.value))}
					sx={{ mr: 1, flex: 1, maxWidth: 'max-content' }}
				/>
				<TextField
					size="small"
					label="Отступ по вертикали (px)"
					type="number"
					value={state.textSettings.verticalSpacing}
					onChange={(e) => updateTextSettings('verticalSpacing', Number(e.target.value))}
					sx={{ mr: 1, flex: 1, maxWidth: 'max-content' }}
					inputProps={{ min: -100, max: 100, step: 1 }}
				/>
				<TextField
					size="small"
					label="Отступ по горизонтали (субпикс.)"
					type="number"
					value={state.textSettings.horizontalSpacing}
					onChange={(e) => updateTextSettings('horizontalSpacing', Number(e.target.value))}
					sx={{ mr: 1, flex: 1, maxWidth: 'max-content' }}
					inputProps={{ min: -100, max: 100, step: 1 }}
				/>
				<TextField
					size="small"
					label="Коэффициент ширины"
					type="number"
					value={state.textSettings.widthScale}
					onChange={(e) => updateTextSettings('widthScale', Number(e.target.value))}
					sx={{ mr: 1, flex: 1, maxWidth: 'max-content' }}
					inputProps={{ min: 0.01, max: 10, step: 0.01 }}
				/>
				<TextField
					select
					size="small"
					label="Направление текста"
					value={state.textSettings.direction}
					onChange={(e) => updateTextSettings('direction', e.target.value)}
					sx={{ flex: 1, maxWidth: 'max-content' }}
				>
					<MenuItem value="ltr">Слева направо</MenuItem>
					<MenuItem value="rtl">Справа налево</MenuItem>
					<MenuItem value="ttb">Сверху вниз</MenuItem>
					<MenuItem value="btt">Снизу вверх</MenuItem>
				</TextField>
			</Toolbar>
		</AppBar>
	);
}