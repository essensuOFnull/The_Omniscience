// glyphUtils.js
export function calculateGlyphs(imageWidth, imageHeight, textSettings) {
    const { text, fontFamily, fontSize, direction } = textSettings;
    if (!text || !imageWidth || !imageHeight) return [];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const font = `${fontSize}px ${fontFamily}`;
    ctx.font = font;

    const lineHeight = fontSize * textSettings.lineHeightMultiplier;
    const widthScale = textSettings.widthScale;

    const glyphs = [];
    let index = 0;
    let charIndex = 0;

    const addGlyph = (char, x, y, width) => {
        glyphs.push({ char, x, y, width, height: lineHeight, index });
        index++;
    };

    const getChars = () => {
        if (direction === 'rtl') return text.split('').reverse();
        if (direction === 'btt') return text.split('').reverse();
        return text.split('');
    };

    const chars = getChars();

    if (direction === 'ltr' || direction === 'rtl') {
        let y = 0;
        while (y + lineHeight <= imageHeight) {
            if (direction === 'ltr') {
                let xFloat = 0;
                while (true) {
                    const char = chars[charIndex % chars.length];
                    charIndex++;
                    const charWidth = ctx.measureText(char).width;
                    const glyphWidth = charWidth * widthScale; // точная ширина
                    if (xFloat + glyphWidth > imageWidth) break;
                    const x = Math.round(xFloat); // целая координата
                    addGlyph(char, x, y, glyphWidth);
                    xFloat += glyphWidth;
                }
            } else { // rtl
                let xFloat = imageWidth;
                while (true) {
                    const char = chars[charIndex % chars.length];
                    charIndex++;
                    const charWidth = ctx.measureText(char).width;
                    const glyphWidth = charWidth * widthScale;
                    const newXFloat = xFloat - glyphWidth;
                    if (newXFloat < 0) break;
                    const x = Math.round(newXFloat);
                    addGlyph(char, x, y, glyphWidth);
                    xFloat = newXFloat;
                }
            }
            y += lineHeight;
        }
    } else if (direction === 'ttb' || direction === 'btt') {
        let maxGlyphWidth = 0;
        for (const char of text) {
            const charWidth = ctx.measureText(char).width;
            const glyphWidth = charWidth * widthScale;
            if (glyphWidth > maxGlyphWidth) maxGlyphWidth = glyphWidth;
        }
        // не округляем maxGlyphWidth

        let xFloat = 0;
        while (xFloat + maxGlyphWidth <= imageWidth) {
            const x = Math.round(xFloat);
            if (direction === 'ttb') {
                let yFloat = 0;
                while (true) {
                    const char = chars[charIndex % chars.length];
                    charIndex++;
                    if (yFloat + lineHeight > imageHeight) break;
                    const y = Math.round(yFloat);
                    addGlyph(char, x, y, maxGlyphWidth);
                    yFloat += lineHeight;
                }
            } else { // btt
                let yFloat = imageHeight;
                while (true) {
                    const char = chars[charIndex % chars.length];
                    charIndex++;
                    const newYFloat = yFloat - lineHeight;
                    if (newYFloat < 0) break;
                    const y = Math.round(newYFloat);
                    addGlyph(char, x, y, maxGlyphWidth);
                    yFloat = newYFloat;
                }
            }
            xFloat += maxGlyphWidth;
        }
    }

    return glyphs;
}