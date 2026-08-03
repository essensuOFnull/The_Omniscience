import write_file from './write_file';
export default function(canvas, index, fileName = null) {
    if (!fileName) {
        fileName = `CACHE/symbols_atlases/${window.CODERROR.__originals__.data.symbol_size}/${index}.png`;
    }
    
    return new Promise((resolve, reject) => {
        // Метод 1: Используем toDataURL как запасной вариант
        try {
            const dataURL = canvas.toDataURL('image/png');
            const base64Data = dataURL.split(',')[1];
            const binaryString = atob(base64Data);
            const uint8Array = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
                uint8Array[i] = binaryString.charCodeAt(i);
            }
            
            write_file(fileName, uint8Array)
                .then(() => {
                    console.log(`Atlas ${index} saved: ${fileName}`);
                    resolve();
                })
                .catch(reject);
                
        } catch (error) {
            console.error(`DataURL method failed for atlas ${index}:`, error);
            reject(error);
        }
    });
}