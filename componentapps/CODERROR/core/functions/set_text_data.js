export default function(x, y, text, textColor = 0xFFFFFF, bgColor = 0x000000, bgAlpha = 0){
	if(y >= 0 && y < d.rows && x >= 0 && x < d.columns){
		let data = d.symbols_grid_data[y][x];
		if(data && text.length > 0){
			data.char = text[0];
			data.textColor = textColor;
			data.bgColor = bgColor;
			data.bgAlpha = bgAlpha;
			f.mark_symbol_dirty(x, y);
		}
	}
}