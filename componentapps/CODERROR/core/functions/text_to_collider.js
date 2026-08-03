export default function(text,void_symbols=['',' ']){
	let lines=text.split("\n"),collider=[];
	for(let line of lines){
		let temp_row=[];
		for(let char of line){
			temp_row.push(...Array(window.CODERROR.__originals__.data.logical_symbol_size).fill(!void_symbols.includes(char)));
		}
		for(let y=0;y<window.CODERROR.__originals__.data.logical_symbol_size;y++){
			collider.push([...temp_row]);
		}
	}
	return collider;
}