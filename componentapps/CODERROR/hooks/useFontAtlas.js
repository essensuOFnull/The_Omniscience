import { useEffect, useRef, useState } from 'react';
import { generateFontAtlas } from '../utils/fontAtlas.js';

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

			const textures = await generateFontAtlas(cellWidth, cellHeight, fontFamily);
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