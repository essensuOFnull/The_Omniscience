import React from 'react';
import ReactDOM from 'react-dom/client';
import { CircularProgress } from '@mui/material';
import { create } from 'jss';
import jssPresetDefault from 'jss-preset-default';

// ====== Асинхронная инициализация ======
(async () => {
	window.jssInstance = create(jssPresetDefault());
	await import('./core/styles.js'); // этот модуль должен определить window.stylesFactory и window.styleTokens
	// после выполнения импорта они уже доступны
	window.jssSheet = window.jssInstance.createStyleSheet(
		window.stylesFactory(window.styleTokens)
	).attach();

	await import('./core/preinit.js');

	await import('./core/data.js');
	await import('./core/functions.js');

	await import('./core/api.js');

	//await import('./core/CODERROR/sound_console.js');
	await import('./core/initial_settings.js');

	await import('./core/main.js');

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

	// 4. Если скрипт языков нужен после рендера – добавляем его динамически через DOM
	const script = document.createElement('script');
	script.src = '../../../componentapps/CODERROR/languages/default.js';
	document.getElementById('languages_div')?.appendChild(script);
})();