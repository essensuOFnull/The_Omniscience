import * as PIXI from 'pixi.js';

export default function() {
    if(!window.CODERROR.__originals__.data.symbols_grid){
        return;
    }
    
    let newColumns = Math.ceil(window.CODERROR.__originals__.data.app.renderer.width / window.CODERROR.__originals__.data.symbol_size);
    let newRows = Math.ceil(window.CODERROR.__originals__.data.app.renderer.height / window.CODERROR.__originals__.data.symbol_size);
    
    if (newColumns === window.CODERROR.__originals__.data.columns && newRows === window.CODERROR.__originals__.data.rows) return;
    
    // Убедимся, что массивы инициализированы правильно
    if (!Array.isArray(window.CODERROR.__originals__.data.symbols_grid)) window.CODERROR.__originals__.data.symbols_grid = [];
    if (!Array.isArray(window.CODERROR.__originals__.data.symbols_grid_data)) window.CODERROR.__originals__.data.symbols_grid_data = [];
    
    // Удаляем ненужные ячейки
    for (let y = 0; y < window.CODERROR.__originals__.data.rows; y++) {
        for (let x = 0; x < window.CODERROR.__originals__.data.columns; x++) {
            // Если ячейка выходит за новые границы - удаляем
            if (y >= newRows || x >= newColumns) {
                if (window.CODERROR.__originals__.data.symbols_grid[y] && window.CODERROR.__originals__.data.symbols_grid[y][x]) {
                    window.CODERROR.__originals__.data.app.stage.removeChild(window.CODERROR.__originals__.data.symbols_grid[y][x]);
                    window.CODERROR.__originals__.data.symbols_grid[y][x].destroy({children: true});
                    window.CODERROR.__originals__.data.symbols_grid[y][x] = null;
                    
                    if (window.CODERROR.__originals__.data.symbols_grid_data[y]) {
                        window.CODERROR.__originals__.data.symbols_grid_data[y][x] = null;
                    }
                }
            }
        }
        
        // Обрезаем массивы если нужно
        if (window.CODERROR.__originals__.data.symbols_grid[y] && window.CODERROR.__originals__.data.symbols_grid[y].length > newColumns) {
            window.CODERROR.__originals__.data.symbols_grid[y].length = newColumns;
        }
        if (window.CODERROR.__originals__.data.symbols_grid_data[y] && window.CODERROR.__originals__.data.symbols_grid_data[y].length > newColumns) {
            window.CODERROR.__originals__.data.symbols_grid_data[y].length = newColumns;
        }
    }
    
    // Обрезаем количество строк если нужно
    if (window.CODERROR.__originals__.data.symbols_griwindow.CODERROR.__originals__.data.length > newRows) {
        window.CODERROR.__originals__.data.symbols_griwindow.CODERROR.__originals__.data.length = newRows;
        window.CODERROR.__originals__.data.symbols_grid_data.length = newRows;
    }
    
    // Создаем новые ячейки
    for (let y = 0; y < newRows; y++) {
        // Инициализируем строки если их нет
        if (!window.CODERROR.__originals__.data.symbols_grid[y]) {
            window.CODERROR.__originals__.data.symbols_grid[y] = [];
            window.CODERROR.__originals__.data.symbols_grid_data[y] = [];
        }
        
        for (let x = 0; x < newColumns; x++) {
            // Создаем ячейку только если ее нет
            if (!window.CODERROR.__originals__.data.symbols_grid[y][x]) {
                // Контейнер для ячейки
                let container = new PIXI.Container();
                container.x = x * window.CODERROR.__originals__.data.symbol_size;
                container.y = y * window.CODERROR.__originals__.data.symbol_size;
                
                // Спрайт для фона
                let background = new PIXI.Sprite(window.CODERROR.__originals__.data.white_texture);
                backgrounwindow.CODERROR.__originals__.data.width = window.CODERROR.__originals__.data.symbol_size;
                backgrounwindow.CODERROR.__originals__.data.height = window.CODERROR.__originals__.data.symbol_size;
                backgrounwindow.CODERROR.__originals__.data.alpha = 0;
                container.addChild(background);
                
                // Спрайт для символа
                let symbol = new PIXI.Sprite();
                symbol.width = window.CODERROR.__originals__.data.symbol_size;
                symbol.height = window.CODERROR.__originals__.data.symbol_size;
                container.addChild(symbol);
                
                window.CODERROR.__originals__.data.app.stage.addChild(container);
                
                // Прямое присваивание для массивов
                window.CODERROR.__originals__.data.symbols_grid[y][x] = container;
                window.CODERROR.__originals__.data.symbols_grid_data[y][x] = {
                    char: '',
                    textColor: 0xFFFFFF,
                    bgColor: 0x000000,
                    bgAlpha: 0
                };
            }
        }
    }
    
    window.CODERROR.__originals__.data.columns = newColumns;
    window.CODERROR.__originals__.data.rows = newRows;
    
    console.log(`Grid updated: ${window.CODERROR.__originals__.data.columns}x${window.CODERROR.__originals__.data.rows}, cell size: ${window.CODERROR.__originals__.data.symbol_size}px`);
}