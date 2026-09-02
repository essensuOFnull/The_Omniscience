// glyphUtils.js
export function calculateGlyphs(imageWidth, imageHeight, textSettings) {
	const { text, fontFamily, fontSize, direction } = textSettings;
	if (!text || !imageWidth || !imageHeight) return [];

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const font = `${fontSize}px ${fontFamily}`;
	ctx.font = font;

	const lineHeight = Math.ceil(fontSize * 1);
	const compressionRatio = 3;

	const glyphs = [];
	let index = 0;
	let charIndex = 0;

	const addGlyph = (char, x, y, width) => {
		glyphs.push({ char, x, y, width, height: lineHeight, index });
		index++;
	};

	// Вычисляем максимальную сжатую ширину символа (для ровных колонок)
	let maxGlyphWidth = 0;
	for (const char of text) {
		const charWidth = ctx.measureText(char).width;
		const glyphWidth = charWidth / compressionRatio;
		if (glyphWidth > maxGlyphWidth) maxGlyphWidth = glyphWidth;
	}

	if (direction === 'ltr' || direction === 'rtl') {
		const chars = direction === 'rtl' ? text.split('').reverse() : text.split('');
		let y = 0;
		while (y + lineHeight <= imageHeight) {
			let x = direction === 'rtl' ? imageWidth : 0;
			while (true) {
				charIndex >= chars.length - 1 ? charIndex = 0 : charIndex++;
				const char = chars[charIndex];
				const charWidth = ctx.measureText(char).width;
				const glyphWidth = charWidth / compressionRatio;
				if (direction === 'ltr') {
					if (x + glyphWidth > imageWidth) break;
					addGlyph(char, x, y, glyphWidth);
					x += glyphWidth;
				} else {
					if (x - glyphWidth < 0) break;
					addGlyph(char, x - glyphWidth, y, glyphWidth);
					x -= glyphWidth;
				}
			}
			y += lineHeight;
		}
	} else if (direction === 'ttb' || direction === 'btt') {
		const chars = direction === 'btt' ? text.split('').reverse() : text.split('');
		let x = 0;
		while (x + maxGlyphWidth <= imageWidth) {
			let y = direction === 'btt' ? imageHeight : 0;
			while (true) {
				charIndex >= chars.length - 1 ? charIndex = 0 : charIndex++;
				const char = chars[charIndex];
				if (direction === 'ttb') {
					if (y + lineHeight > imageHeight) break;
					addGlyph(char, x, y, maxGlyphWidth);
					y += lineHeight;
				} else {
					if (y - lineHeight < 0) break;
					addGlyph(char, x, y - lineHeight, maxGlyphWidth);
					y -= lineHeight;
				}
			}
			x += maxGlyphWidth;
		}
	}

	return glyphs;
}