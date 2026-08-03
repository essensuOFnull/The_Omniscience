import get_symbol_texture from './get_symbol_texture';
export default function(){
    // CPU режим - используем оптимизированный рендеринг с атласами
    if(d.symbols_dirty_cells && d.symbols_dirty_cells.size > 0){
        for(let cellKey of d.symbols_dirty_cells){
            const [y, x] = cellKey.split(',').map(Number);
            if(y < 0 || y >= d.rows || x < 0 || x >= d.columns) continue;
            
            let container = d.symbols_grid[y][x];
            let data = d.symbols_grid_data[y][x];
            
            if(!container || !data) continue;
            
            let textElement = container.children[1];
            let background = container.children[0];
            
            // Обновляем только изменённые свойства символа
            if(textElement._lastChar !== data.char) {
                textElement._lastChar = data.char;
                if(data.char && data.char !== '') {
                    const texture = get_symbol_texture(data.char);
                    if(texture) {
                        textElement.texture = texture;
                        textElement.alpha = 1;
                    } else {
                        textElement.alpha = 0;
                    }
                } else {
                    textElement.alpha = 0;
                }
            }
            
            if(textElement.tint !== data.textColor) {
                textElement.tint = data.textColor;
            }
            
            // Обновляем фон (просто меняем tint и alpha спрайта)
            if(background.tint !== data.bgColor || background.alpha !== data.bgAlpha) {
                background.tint = data.bgColor;
                background.alpha = data.bgAlpha;
            }
        }
        d.symbols_dirty_cells.clear();
    }
}