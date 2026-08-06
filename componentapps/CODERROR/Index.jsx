import React from 'react';
import ReactDOM from 'react-dom/client';
import { CircularProgress } from '@mui/material';
import { create } from 'jss';
import jssPresetDefault from 'jss-preset-default';

import preinit from './core/preinit';
import main from './core/main';
import data from './core/data';
import styles from './core/styles';
import api from './core/api';

// ====== инициализация ======
(async () => {
	preinit();
	data();

	window.jssInstance = create(jssPresetDefault());
	styles();
	// после выполнения импорта они уже доступны
	window.jssSheet = window.jssInstance.createStyleSheet(
		window.stylesFactory(window.styleTokens)
	).attach();

	api();

	//await import('./core/CODERROR/sound_console.js');
	await import('./languages/default.js');
	await import('./core/initial_settings.js');

	main();

	// ====== Рендер React ======
	const root = ReactDOM.createRoot(document.getElementById('root'));
	root.render(
		<>
			<CircularProgress
				id="loading"
				size="min(80vw,80vh)"
				sx={{
					color: '#f0f',
					position: 'absolute',
					left: '50%',
					top: '50%',
					transform: 'translate(-50%,-50%)',
				}}
			/>
			<div id="wrapper" />
			<img id="cursor" src="" />
			<div id="languages_div" style={{ display: 'contents' }}>
				{/* Скрипты в JSX так не вставляются – исправим ниже */}
			</div>
		</>
	);
})();