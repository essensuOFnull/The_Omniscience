import init_symbols_atlas from './init_symbols_atlas';
import update_symbols_grid from './update_symbols_grid';
export default function(size_in_pixels,first_init=false) {
	if(d.symbol_size!=size_in_pixels){
		d.symbol_size = size_in_pixels;
		if(window.updateStyleTokens) window.updateStyleTokens({ symbol_size: d.symbol_size });
		
		if(!first_init){
			// Пересоздаем атлас с новым размером
			init_symbols_atlas().then(()=>{
				update_symbols_grid();
			});
		}
	}
}