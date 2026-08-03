import save_atlas_as_PNG from './save_atlas_as_PNG';
import write_file from './write_file';
export default function() {
    if (!window.CODERROR.__originals__.data.symbols_atlases || window.CODERROR.__originals__.data.symbols_atlases.length === 0) {
        console.warn('No atlases to save');
        return;
    }
    
    // Создаем информацию об атласах для сохранения
    const atlasInfo = {
        version: 1,
        symbol_size: window.CODERROR.__originals__.data.symbol_size,
        atlases: [],
        symbols_map: window.CODERROR.__originals__.data.symbols_atlas_map
    };
    
    // Сохраняем каждый атлас и собираем информацию
    const savePromises = window.CODERROR.__originals__.data.symbols_atlases.map((atlas, index) => {
        const fileName = `CACHE/symbols_atlases/${window.CODERROR.__originals__.data.symbol_size}/${index}.png`;
        
        atlasInfo.atlases.push({
            filename: fileName,
            cols: atlas.cols,
            rows: atlas.rows
        });
        
        return save_atlas_as_PNG(atlas.canvas, index, fileName);
    });
    
    // Сохраняем информацию об атласах
    const infoPath = `CACHE/symbols_atlases/${window.CODERROR.__originals__.data.symbol_size}/info.json`;
    const infoJson = JSON.stringify(atlasInfo, null, 2);
    
    savePromises.push(write_file(infoPath, infoJson));
    
    Promise.all(savePromises).then(() => {
        console.log('All atlases and info saved successfully');
    }).catch(error => {
        console.error('Error saving atlases:', error);
    });
}