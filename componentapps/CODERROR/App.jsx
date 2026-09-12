import './utils/audioWorkletPatch.js';

import React, { useEffect, useRef, useState } from 'react';

import CharacterGrid from './components/CharacterGrid.jsx';
import Logo from './components/Logo.jsx';
import MusicEditor from './components/MusicEditor.jsx';

import { useStrudel } from './hooks/useStrudel.js';
import { usePhysicsLoop } from './hooks/usePhysicsLoop.js';

const MUSIC_PATH = '../../../componentapps/CODERROR/music/MainMenu.js';

function App() {
	const cellWidth = 16;
	const cellHeight = 16;
	const fontFamily = 'Terminus';

	const [width, setWidth] = useState(window.innerWidth);
	const [height, setHeight] = useState(window.innerHeight);

	const viewRef = useRef(null);

	const tpsRef = useRef(0);

	// Strudel: init + загрузка кода + получение pattern/miniLocations
	const { musicCode, isMusicReady, replRef, patternRef, miniLocationsRef } =
		useStrudel({ musicPath: MUSIC_PATH });

	// Цикл физики 60 tps: подсветка активных haps
	usePhysicsLoop({
		enabled: isMusicReady,
		replRef,
		patternRef,
		miniLocationsRef,
		viewRef,
		tpsRef,
	});

	// Resize
	useEffect(() => {
		const onResize = () => {
			setWidth(window.innerWidth);
			setHeight(window.innerHeight);
		};
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);

	return (
		<div
			style={{
				position: 'relative',
				width: '100vw',
				height: '100vh',
				overflow: 'hidden',
			}}
			className="ignore_The_Omniscience_Theme"
		>
			<CharacterGrid
				width={width}
				height={height}
				cellWidth={cellWidth}
				cellHeight={cellHeight}
				fontFamily={fontFamily}
				tpsRef={tpsRef}
			/>

			<Logo cellHeight={cellHeight} />

			{isMusicReady && (
				<MusicEditor
					value={musicCode}
					cellWidth={cellWidth}
					cellHeight={cellHeight}
					onCreateEditor={(view) => {
						viewRef.current = view;
						console.log('[cm] editor created');
					}}
				/>
			)}
		</div>
	);
}

export default App;