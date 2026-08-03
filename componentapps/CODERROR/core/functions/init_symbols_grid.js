import init_symbols_atlas from './init_symbols_atlas';
import update_symbols_grid from './update_symbols_grid';
export default async function() {
    window.CODERROR.__originals__.data.symbols_grid = [];
    window.CODERROR.__originals__.data.symbols_grid_data = [];
    window.CODERROR.__originals__.data.columns = 0;
    window.CODERROR.__originals__.data.rows = 0;
    
    // Создаем атласы символов (загружаем с диска или создаем новые)
    await init_symbols_atlas()
	// Создаем текстуру для белого пикселя (для фона)
	window.CODERROR.__originals__.data.white_texture = PIXI.Texture.WHITE;

	update_symbols_grid();
}