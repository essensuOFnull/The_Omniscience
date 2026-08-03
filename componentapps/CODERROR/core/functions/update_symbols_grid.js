export default function() {
    if(!d.symbols_grid){
        return;
    }
    
    let newColumns = Math.ceil(d.app.renderer.width / d.symbol_size);
    let newRows = Math.ceil(d.app.renderer.height / d.symbol_size);
    
    if (newColumns === d.columns && newRows === d.rows) return;
    
    // Убедимся, что массивы инициализированы правильно
    if (!Array.isArray(d.symbols_grid)) d.symbols_grid = [];
    if (!Array.isArray(d.symbols_grid_data)) d.symbols_grid_data = [];
    
    // Удаляем ненужные ячейки
    for (let y = 0; y < d.rows; y++) {
        for (let x = 0; x < d.columns; x++) {
            // Если ячейка выходит за новые границы - удаляем
            if (y >= newRows || x >= newColumns) {
                if (d.symbols_grid[y] && d.symbols_grid[y][x]) {
                    d.app.stage.removeChild(d.symbols_grid[y][x]);
                    d.symbols_grid[y][x].destroy({children: true});
                    d.symbols_grid[y][x] = null;
                    
                    if (d.symbols_grid_data[y]) {
                        d.symbols_grid_data[y][x] = null;
                    }
                }
            }
        }
        
        // Обрезаем массивы если нужно
        if (d.symbols_grid[y] && d.symbols_grid[y].length > newColumns) {
            d.symbols_grid[y].length = newColumns;
        }
        if (d.symbols_grid_data[y] && d.symbols_grid_data[y].length > newColumns) {
            d.symbols_grid_data[y].length = newColumns;
        }
    }
    
    // Обрезаем количество строк если нужно
    if (d.symbols_grid.length > newRows) {
        d.symbols_grid.length = newRows;
        d.symbols_grid_data.length = newRows;
    }
    
    // Создаем новые ячейки
    for (let y = 0; y < newRows; y++) {
        // Инициализируем строки если их нет
        if (!d.symbols_grid[y]) {
            d.symbols_grid[y] = [];
            d.symbols_grid_data[y] = [];
        }
        
        for (let x = 0; x < newColumns; x++) {
            // Создаем ячейку только если ее нет
            if (!d.symbols_grid[y][x]) {
                // Контейнер для ячейки
                let container = new PIXI.Container();
                container.x = x * d.symbol_size;
                container.y = y * d.symbol_size;
                
                // Спрайт для фона
                let background = new PIXI.Sprite(d.white_texture);
                background.width = d.symbol_size;
                background.height = d.symbol_size;
                background.alpha = 0;
                container.addChild(background);
                
                // Спрайт для символа
                let symbol = new PIXI.Sprite();
                symbol.width = d.symbol_size;
                symbol.height = d.symbol_size;
                container.addChild(symbol);
                
                d.app.stage.addChild(container);
                
                // Прямое присваивание для массивов
                d.symbols_grid[y][x] = container;
                d.symbols_grid_data[y][x] = {
                    char: '',
                    textColor: 0xFFFFFF,
                    bgColor: 0x000000,
                    bgAlpha: 0
                };
            }
        }
    }
    
    d.columns = newColumns;
    d.rows = newRows;
    
    console.log(`Grid updated: ${d.columns}x${d.rows}, cell size: ${d.symbol_size}px`);
}