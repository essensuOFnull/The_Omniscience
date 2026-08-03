export default async function() {
    d.symbols_grid = [];
    d.symbols_grid_data = [];
    d.columns = 0;
    d.rows = 0;
    
    // Создаем атласы символов (загружаем с диска или создаем новые)
    await f.init_symbols_atlas()
	// Создаем текстуру для белого пикселя (для фона)
	d.white_texture = PIXI.Texture.WHITE;

	f.update_symbols_grid();
}