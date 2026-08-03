import read_file from './read_file';
export default function() {
    return new Promise((resolve, reject) => {
        const infoPath = `CACHE/symbols_atlases/${window.CODERROR.__originals__.data.symbol_size}/info.json`;
        
        read_file(infoPath).then(infoData => {
            const info = JSON.parse(infoData);
            
            window.CODERROR.__originals__.data.symbols_atlases = [];
            window.CODERROR.__originals__.data.symbols_atlas_map = info.symbols_map;
            
            // Загружаем каждый атлас
            const loadPromises = info.atlases.map((atlasInfo, index) => {
                return new Promise((resolve, reject) => {
                    // Создаем изображение для загрузки текстуры
                    const img = new Image();
                    img.onload = () => {
                        const texture = PIXI.Texture.from(img);
                        window.CODERROR.__originals__.data.symbols_atlases[index] = {
                            texture: texture,
                            cols: atlasInfo.cols,
                            rows: atlasInfo.rows
                        };
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = atlasInfo.filename;
                });
            });
            
            Promise.all(loadPromises).then(() => {
                console.log(`Loaded ${window.CODERROR.__originals__.data.symbols_atlases.length} cached atlases`);
                resolve();
            }).catch(error => {
                reject(error);
            });
            
        }).catch(error => {
            reject(error);
        });
    });
}