export default function(x, y){
	if(!d.symbols_dirty_cells) d.symbols_dirty_cells = new Set();
	d.symbols_dirty_cells.add(`${y},${x}`);
}