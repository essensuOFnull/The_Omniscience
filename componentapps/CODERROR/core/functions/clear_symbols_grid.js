export default function(){
	for(let y=0;y<d.rows;y++){
		for(let x=0;x<d.columns;x++){
			f.set_symbol_data(x, y, '', 0xFFFFFF, 0x000000, 0);
		}
	}
}