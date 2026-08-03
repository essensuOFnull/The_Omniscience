import set_symbol_data from './set_symbol_data';
export default function(text,x,y,color=0xFFFFFF,bgColor=0x000000,bgAlpha=0){
	x=Math.floor(x);
	y=Math.floor(y);
	let current_x=x,current_y=y;
	for(let symbol of text){
		if(current_x>=0&&current_x<window.CODERROR.__originals__.data.columns&&current_y>=0&&current_y<window.CODERROR.__originals__.data.rows){
			set_symbol_data(current_x, current_y, symbol, color, bgColor, bgAlpha);
		}
		if(symbol=='\n'){
			current_x=x;
			current_y++;
		}
		else{
			current_x++;
		}
	}
}