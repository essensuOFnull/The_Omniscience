export default function(text,void_symbols=['',' ']){
	let lines=text.split("\n"),collider=[];
	for(let line of lines){
		let temp_row=[];
		for(let char of line){
			temp_row.push(...Array(d.logical_symbol_size).fill(!void_symbols.includes(char)));
		}
		for(let y=0;y<d.logical_symbol_size;y++){
			collider.push([...temp_row]);
		}
	}
	return collider;
}