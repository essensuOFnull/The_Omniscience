export default function(x, y){
	if(!window.CODERROR.__originals__.data.symbols_dirty_cells) window.CODERROR.__originals__.data.symbols_dirty_cells = new Set();
	window.CODERROR.__originals__.data.symbols_dirty_cells.add(`${y},${x}`);
}