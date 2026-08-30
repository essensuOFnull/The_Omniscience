import React, { useContext, useRef } from 'react';
import {
	AppBar, Toolbar, Button, IconButton, Box, TextField, Select, MenuItem, Typography
} from '@mui/material';
import { AppContext } from './App';
import { importImage, exportImage, saveProject, openProject } from './fileUtils';

export default function TopBar() {
	const { state, dispatch } = useContext(AppContext);
	const fileInputRef = useRef(null);

	const handleImportClick = () => fileInputRef.current.click();
	const handleFileChange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		await importImage(file, dispatch);
	};

	// Заглушки для текстовых настроек (будут использованы позже)
	const [text, setText] = React.useState('Lorem ipsum dolor sit amet');
	const [fontSize, setFontSize] = React.useState(16);
	const [fontFamily, setFontFamily] = React.useState('Arial');
	const [direction, setDirection] = React.useState('ltr');

	return (
		<AppBar position="static" color="default">
			<Toolbar variant="dense">
				<Button onClick={handleImportClick}>Импорт</Button>
				<input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
				<Button onClick={() => exportImage(state.image, state.layers)}>Экспорт PNG</Button>
				<Button onClick={() => saveProject(state)}>Сохранить .stg</Button>
				<Button onClick={() => openProject(dispatch)}>Открыть .stg</Button>

				<Box sx={{ flexGrow: 1 }} />

				{/* Заглушки настроек текста */}
				<TextField
					size="small"
					label="Текст"
					value={text}
					onChange={(e) => setText(e.target.value)}
					sx={{ width: 200, mr: 1 }}
				/>
				<Select
					size="small"
					value={fontFamily}
					onChange={(e) => setFontFamily(e.target.value)}
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
					value={fontSize}
					onChange={(e) => setFontSize(Number(e.target.value))}
					sx={{ width: 80, mr: 1 }}
				/>
				<Select
					size="small"
					value={direction}
					onChange={(e) => setDirection(e.target.value)}
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