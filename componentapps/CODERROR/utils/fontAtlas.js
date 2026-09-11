import { Texture, Rectangle } from 'pixi.js';

// Диапазоны-кандидаты (без изменений)
const CANDIDATE_RANGES = [
	[0x0020, 0x007E], [0x00A0, 0x00FF], [0x0100, 0x017F], [0x0180, 0x024F],
	[0x0250, 0x02AF], [0x02B0, 0x02FF], [0x0370, 0x03FF], [0x0400, 0x04FF],
	[0x0590, 0x05FF], [0x1E00, 0x1EFF], [0x2000, 0x206F], [0x2070, 0x209F],
	[0x20A0, 0x20CF], [0x2100, 0x214F], [0x2190, 0x21FF], [0x2200, 0x22FF],
	[0x2300, 0x23FF], [0x2400, 0x243F], [0x2500, 0x257F], [0x2580, 0x259F],
	[0x25A0, 0x25FF], [0x2600, 0x26FF], [0x2700, 0x27BF], [0x27C0, 0x27EF],
	[0x2800, 0x28FF], [0x2E00, 0x2E7F], [0xE000, 0xF8FF],
];

// Непечатаемые категории Unicode (Cc, Cf, Cs, Co, Cn, Zl, Zp)
const NON_PRINTABLE_RE = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}]/u;

/**
 * Рендерит символ на маленький canvas и возвращает его как data URL.
 * Используется для сравнения с эталонным .notdef.
 */
function renderGlyphDataURL(char, fontSize, fontFamily) {
	const c = document.createElement('canvas');
	c.width = fontSize * 2;
	c.height = fontSize * 2;
	const ctx = c.getContext('2d');
	ctx.font = `${fontSize}px "${fontFamily}"`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = '#fff';
	ctx.fillText(char, c.width / 2, c.height / 2);
	return c.toDataURL();
}

/**
 * Проверяет, есть ли на canvas хоть один непрозрачный пиксель.
 */
function hasVisiblePixels(char, fontSize, fontFamily) {
	const c = document.createElement('canvas');
	c.width = fontSize * 2;
	c.height = fontSize * 2;
	const ctx = c.getContext('2d');
	ctx.font = `${fontSize}px "${fontFamily}"`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = '#fff';
	ctx.fillText(char, c.width / 2, c.height / 2);

	const img = ctx.getImageData(0, 0, c.width, c.height);
	for (let i = 3; i < img.data.length; i += 4) {
		if (img.data[i] !== 0) return true; // есть хоть один непрозрачный пиксель
	}
	return false;
}

async function ensureFontLoaded(fontFamily, fontSize) {
	// 1. Явно просим загрузку
	await document.fonts.load(`${fontSize}px "${fontFamily}"`);
	// 2. Ждём все pending-загрузки
	await document.fonts.ready;
	// 3. Контрольная проверка
	if (!document.fonts.check(`${fontSize}px "${fontFamily}"`, 'A')) {
		throw new Error(`Font "${fontFamily}" не загружен`);
	}
}

/**
 * Собирает только реально видимые и печатные символы.
 */
async function collectVisibleChars(ff, fontSize) {
	ensureFontLoaded(ff, fontSize);

	await document.fonts.load(`${fontSize}px "${ff}"`);
	await document.fonts.ready;

	// Эталон «отсутствующего» глифа
	const tofuDataURL = renderGlyphDataURL('\uFFFF', fontSize, ff);

	const out = [];
	const seen = new Set();

	for (const [start, end] of CANDIDATE_RANGES) {
		for (let code = start; code <= end; code++) {
			if (code < 0x20 || code === 0x7F) continue; // управляющие ASCII

			const char = String.fromCodePoint(code);
			if (seen.has(char)) continue;

			// 1. Отсеиваем непечатаемые категории Unicode
			if (NON_PRINTABLE_RE.test(char)) continue;

			// 2. Проверяем, что глиф вообще видим (не пробел, не пустой)
			if (!hasVisiblePixels(char, fontSize, ff)) continue;

			// 3. Сравниваем с эталонным .notdef (квадратиком)
			const charDataURL = renderGlyphDataURL(char, fontSize, ff);
			if (charDataURL === tofuDataURL) continue; // это .notdef — пропускаем

			seen.add(char);
			out.push(char);
		}
	}
	return out;
}

/**
 * Генерирует мульти-атлас (как в предыдущем ответе),
 * но только для реально поддерживаемых и видимых символов.
 */
export async function generateFontAtlas(cw, ch, ff, atlasSize = 1024) {
	const chars = await collectVisibleChars(ff, ch);

	const cols = Math.max(1, Math.floor(atlasSize / cw));
	const rows = Math.max(1, Math.floor(atlasSize / ch));
	const perPage = cols * rows;
	const pageCount = Math.max(1, Math.ceil(chars.length / perPage));

	const pages = [];
	const result = new Map();

	for (let p = 0; p < pageCount; p++) {
		const canvas = document.createElement('canvas');
		canvas.width = atlasSize;
		canvas.height = atlasSize;
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, atlasSize, atlasSize);
		ctx.font = `${ch}px "${ff}"`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = '#ffffff';

		const start = p * perPage;
		const end = Math.min(start + perPage, chars.length);

		for (let i = start; i < end; i++) {
			const local = i - start;
			const col = local % cols;
			const row = (local / cols) | 0;
			const x = col * cw;
			const y = row * ch;
			ctx.fillText(chars[i], x + cw / 2, y + ch / 2);
		}

		const pageTex = Texture.from(canvas);
		if (pageTex.source) {
			pageTex.source.scaleMode = 'nearest';
			pageTex.source.mipmap = false;
		}
		pages.push(pageTex);

		for (let i = start; i < end; i++) {
			const local = i - start;
			const col = local % cols;
			const row = (local / cols) | 0;
			const frame = new Rectangle(col * cw, row * ch, cw, ch);
			const sub = new Texture({ source: pageTex.source, frame });
			result.set(chars[i], sub);
		}
	}

	result.pages = pages;
	result.cw = cw;
	result.ch = ch;

	return result;
}

export function getCharTexture(atlas, char) {
	const info = atlas.map.get(char);
	if (!info) return null;
	const page = atlas.pages[info.page];
	return new Texture({
		source: page.source,
		frame: new Rectangle(info.x, info.y, info.w, info.h),
	});
}