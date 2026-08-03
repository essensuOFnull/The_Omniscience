import mark_symbol_dirty from './mark_symbol_dirty';
export default function(x, y, text, textColor = 0xFFFFFF, bgColor = 0x000000, bgAlpha = 0){
	if(y >= 0 && y < window.CODERROR.__originals__.data.rows && x >= 0 && x < window.CODERROR.__originals__.data.columns){
		let data = window.CODERROR.__originals__.data.symbols_grid_data[y][x];
		if(data && text.length > 0){
			data.char = text[0];
			data.textColor = textColor;
			data.bgColor = bgColor;
			data.bgAlpha = bgAlpha;
			mark_symbol_dirty(x, y);
		}
	}
}