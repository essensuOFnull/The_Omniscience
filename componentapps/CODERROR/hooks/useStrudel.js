import { useEffect, useRef, useState } from 'react';
import { initStrudel, evaluate } from '@strudel/web';
import { fetchTextFile } from '../utils/fetchTextFile.js';

export function useStrudel({ musicPath }) {
	const [musicCode, setMusicCode] = useState('');
	const [isMusicReady, setIsMusicReady] = useState(false);

	const replRef = useRef(null);
	const patternRef = useRef(null);
	const miniLocationsRef = useRef(null);

	useEffect(() => {
		let cancelled = false;

		(async () => {
			try {
				const repl = await initStrudel();
				if (cancelled) return;
				replRef.current = repl;

				const resume = () => window.__strudelCtx?.resume?.();
				resume();
				document.addEventListener('click', resume, { once: true });

				// Прогрев ворклетов.
				await evaluate('stack()');
				await new Promise((r) => setTimeout(r, 800));
				if (cancelled) return;

				const code = await fetchTextFile(musicPath);
				if (cancelled || !code) return;

				setMusicCode(code);
				setIsMusicReady(true);

				const result = await evaluate(code);
				if (cancelled) return;

				const pattern =
					result?.pattern ||
					result?.meta?.pattern ||
					repl?.state?.pattern ||
					null;
				const miniLocs =
					result?.miniLocations ||
					result?.meta?.miniLocations ||
					repl?.state?.meta?.miniLocations ||
					repl?.state?.miniLocations ||
					null;

				if (pattern) patternRef.current = pattern;
				if (miniLocs) miniLocationsRef.current = miniLocs;

				console.log(
					'[strudel] pattern?',
					!!pattern,
					'miniLocs?',
					miniLocs?.length
				);
			} catch (e) {
				console.error('Strudel init failed:', e);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [musicPath]);

	return { musicCode, isMusicReady, replRef, patternRef, miniLocationsRef };
}