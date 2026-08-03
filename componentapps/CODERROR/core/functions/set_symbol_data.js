import get_symbol_texture from './get_symbol_texture';
import mark_symbol_dirty from'./mark_symbol_dirty';
export default function(x, y, char, textColor = 0xFFFFFF, bgColor = 0x000000, bgAlpha = 0) {
    let container = _.get(d, ['symbols_grid', y, x]),
    data = _.get(d, ['symbols_grid_data', y, x]);
    if(!container||!data) return;
    
    // Сохраняем данные
    data.char = char;
    data.textColor = textColor;
    data.bgColor = bgColor;
    data.bgAlpha = bgAlpha;
    
	// CPU режим - обновляем спрайты напрямую
	let background = container.children[0];
	let symbol = container.children[1];
	
	// Обновляем фон
	backgrounwindow.CODERROR.__originals__.data.tint = bgColor;
	backgrounwindow.CODERROR.__originals__.data.alpha = bgAlpha;
	
	// Обновляем символ
	if(char && char !== '') {
		const texture = get_symbol_texture(char);
		if(texture) {
			symbol.texture = texture;
			symbol.tint = textColor;
			symbol.alpha = 1;
		} else {
			symbol.alpha = 0;
		}
	} else {
		symbol.alpha = 0;
	}
    
    mark_symbol_dirty(x, y);
}