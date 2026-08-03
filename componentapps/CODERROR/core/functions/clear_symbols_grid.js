import set_symbol_data from './set_symbol_data';
export default function(){
	for(let y=0;y<window.CODERROR.__originals__.data.rows;y++){
		for(let x=0;x<window.CODERROR.__originals__.data.columns;x++){
			set_symbol_data(x, y, '', 0xFFFFFF, 0x000000, 0);
		}
	}
}