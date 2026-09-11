import { useEffect, useRef, useState } from 'react';
import { getFontAtlas } from '../utils/fontAtlas.js';

export function useFontAtlas({ ready, cellWidth, cellHeight, fontFamily }) {
	const [fontTextures, setFontTextures] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const fontTexturesRef = useRef(null);

	useEffect(() => {
		if (!ready) return;
		let cancelled = false;

		(async () => {
			setIsLoading(true);
			await document.fonts.load(`${cellHeight}px "${fontFamily}"`);
			await document.fonts.ready;

			const textures = await getFontAtlas(cellWidth, cellHeight, fontFamily, 1024);
			if (cancelled) return;

			fontTexturesRef.current = textures;
			setFontTextures(textures);
			setIsLoading(false);
		})();

		return () => {
			cancelled = true;
		};
	}, [ready, cellWidth, cellHeight, fontFamily]);

	return { fontTextures, fontTexturesRef, isLoading };
}