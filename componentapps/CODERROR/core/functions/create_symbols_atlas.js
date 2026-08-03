import init_printable_symbols from './init_printable_symbols';
import save_atlases_to_disk from './save_atlases_to_disk';
export default function() {
    if (!d.printable_symbols || d.printable_symbols.length === 0) {
        init_printable_symbols();
    }
    
    // Если printable_symbols - строка, преобразуем в массив символов
    const symbolsArray = typeof d.printable_symbols === 'string' 
        ? Array.from(d.printable_symbols) 
        : d.printable_symbols;
    
    const size = d.symbol_size;
    const resolution = 4;
    const maxAtlasSize = 2048;
    const symbolsPerRow = Math.floor(maxAtlasSize / size);
    const symbolsPerAtlas = symbolsPerRow * symbolsPerRow;
    
    d.symbols_atlases = [];
    d.symbols_atlas_map = {};
    
    // Создаем все атласы
    for (let i = 0; i < symbolsArray.length; i += symbolsPerAtlas) {
        const chunk = symbolsArray.slice(i, Math.min(i + symbolsPerAtlas, symbolsArray.length));
        
        if (chunk.length === 0) {
            console.warn('Empty chunk encountered, skipping atlas creation');
            continue;
        }
        
        const atlasIndex = d.symbols_atlases.length;
        
        const cols = Math.min(symbolsPerRow, chunk.length);
        const rows = Math.ceil(chunk.length / cols);
        
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = cols * size;
        finalCanvas.height = rows * size;
        
        if (finalCanvas.width === 0 || finalCanvas.height === 0) {
            console.error('Final canvas has zero dimensions:', finalCanvas.width, finalCanvas.height);
            continue;
        }
        
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.imageSmoothingEnabled = false;
        
        finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size * resolution;
        tempCanvas.height = size * resolution;
        
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `${size * resolution}px CODERROR, monospace`;
        tempCtx.textAlign = 'start';
        tempCtx.textBaseline = 'top';
        tempCtx.fillStyle = '#ffffff';
        
        for (let j = 0; j < chunk.length; j++) {
            const char = chunk[j];
            
            const col = j % cols;
            const row = Math.floor(j / cols);
            
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            const x = 0;
            const y = 0;
            tempCtx.fillText(char, x, y);
            
            const destX = col * size;
            const destY = row * size;
            
            finalCtx.drawImage(
                tempCanvas,
                0, 0, tempCanvas.width, tempCanvas.height,
                destX, destY, size, size
            );
            
            d.symbols_atlas_map[char] = {
                atlasIndex: atlasIndex,
                charIndex: j,
                cols: cols,
                rows: rows
            };
        }
        
        const atlasData = {
            texture: PIXI.Texture.from(finalCanvas),
            cols: cols,
            rows: rows,
            canvas: finalCanvas
        };
        
        d.symbols_atlases.push(atlasData);
        console.log(`Created atlas ${atlasIndex}: ${cols}x${rows} symbols, ${finalCanvas.width}x${finalCanvas.height} pixels, ${chunk.length} chars`);
    }
    
    if (d.symbols_atlases.length === 0) {
        console.error('No atlases were created - check printable_symbols and symbol_size');
        return;
    }

    save_atlases_to_disk();
}