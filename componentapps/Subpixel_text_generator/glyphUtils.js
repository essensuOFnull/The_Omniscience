export function calculateGlyphs(imageWidth, imageHeight, textSettings, glyphAtlas) {
    const { text, direction, horizontalSpacing, verticalSpacing } = textSettings;
    if (!text || !imageWidth || !imageHeight || !glyphAtlas) return [];

    const imageWidthSubpx = imageWidth * 3;
    const imageHeightSubpx = imageHeight * 3;
    const horizontalGap = Math.round(horizontalSpacing);//ни в коем случае не max(0,...) // субпиксели
    const verticalGap = Math.round(verticalSpacing) * 3;//ни в коем случае не max(0,...) // переводим пиксели в субпиксели

    // Все символы имеют одинаковую высоту (heightSubpx в атласе)
    const maxHeightSubpx = Math.max(1, ...Object.values(glyphAtlas).map(e => e.heightSubpx));
    const glyphs = [];
    let index = 0;
    let charIndex = 0;

    const chars = (direction === 'rtl' || direction === 'btt') ? Array.from(text).reverse() : Array.from(text);

    const addGlyph = (char, xSubpx, ySubpx, widthSubpx, heightSubpx) => {
        glyphs.push({
            char,
            x: xSubpx / 3,
            y: ySubpx / 3,
            width: widthSubpx / 3,
            height: heightSubpx / 3,
            xSubpx,
            ySubpx,
            widthSubpx,
            heightSubpx,
            index,
        });
        index++;
    };

    if (direction === 'ltr' || direction === 'rtl') {
        let ySubpx = 0;
        while (ySubpx + maxHeightSubpx <= imageHeightSubpx) {
            if (direction === 'ltr') {
                let xSubpx = 0;
                while (true) {
                    const char = chars[charIndex % chars.length];
                    charIndex++;
                    const entry = glyphAtlas[char];
                    if (!entry) continue;
                    const w = entry.widthSubpx;
                    if (xSubpx + w > imageWidthSubpx) break;
                    addGlyph(char, xSubpx, ySubpx, w, maxHeightSubpx);
                    xSubpx += w + horizontalGap;
                }
            } else { // rtl
                let xSubpx = imageWidthSubpx;
                while (true) {
                    const char = chars[charIndex % chars.length];
                    charIndex++;
                    const entry = glyphAtlas[char];
                    if (!entry) continue;
                    const w = entry.widthSubpx;
                    const newX = xSubpx - w;
                    if (newX < 0) break;
                    addGlyph(char, newX, ySubpx, w, maxHeightSubpx);
                    xSubpx = newX - horizontalGap;
                }
            }
            ySubpx += maxHeightSubpx + verticalGap;
        }
    } else if (direction === 'ttb' || direction === 'btt') {
        let maxWidthSubpx = 1;
        for (const ch of text) {
            const entry = glyphAtlas[ch];
            if (entry && entry.widthSubpx > maxWidthSubpx) maxWidthSubpx = entry.widthSubpx;
        }

        let xSubpx = 0;
        while (xSubpx + maxWidthSubpx <= imageWidthSubpx) {
            if (direction === 'ttb') {
                let ySubpx = 0;
                while (true) {
                    const char = chars[charIndex % chars.length];
                    charIndex++;
                    const entry = glyphAtlas[char];
                    if (!entry) continue;
                    if (ySubpx + maxHeightSubpx > imageHeightSubpx) break;
                    addGlyph(char, xSubpx, ySubpx, maxWidthSubpx, maxHeightSubpx);
                    ySubpx += maxHeightSubpx + verticalGap;
                }
            } else { // btt
                let ySubpx = imageHeightSubpx;
                while (true) {
                    const char = chars[charIndex % chars.length];
                    charIndex++;
                    const entry = glyphAtlas[char];
                    if (!entry) continue;
                    const newY = ySubpx - maxHeightSubpx;
                    if (newY < 0) break;
                    addGlyph(char, xSubpx, newY, maxWidthSubpx, maxHeightSubpx);
                    ySubpx = newY - verticalGap;
                }
            }
            xSubpx += maxWidthSubpx + horizontalGap;
        }
    }

    return glyphs;
}