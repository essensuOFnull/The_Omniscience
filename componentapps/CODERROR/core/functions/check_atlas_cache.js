import file_exists from './file_exists';
import read_file from './read_file';
export default function() {
    return new Promise((resolve, reject) => {
        const infoPath = `CACHE/symbols_atlases/${d.symbol_size}/info.json`;
        
        file_exists(infoPath).then(exists => {
            if (!exists) {
                resolve(false);
                return;
            }
            
            // Читаем информацию о кэше
            read_file(infoPath).then(infoData => {
                try {
                    const info = JSON.parse(infoData);
                    
                    // Проверяем версию и размер символов
                    if (info.version !== 1 || info.symbol_size !== d.symbol_size) {
                        resolve(false);
                        return;
                    }
                    
                    // Проверяем существование всех файлов атласов
                    const checkPromises = info.atlases.map(atlasInfo => 
                        file_exists(atlasInfo.filename)
                    );
                    
                    Promise.all(checkPromises).then(results => {
                        const allExist = results.every(exists => exists);
                        resolve(allExist);
                    }).catch(reject);
                    
                } catch (error) {
                    reject(error);
                }
            }).catch(reject);
        }).catch(reject);
    });
}