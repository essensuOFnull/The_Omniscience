export default function(relPath, contents) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!d.directory_handle) {
                reject(new Error('Directory handle is not available'));
                return;
            }

            const parts = relPath.split('/').filter(Boolean);
            let currentDir = d.directory_handle;

            // Создаем директории по пути
            for (let i = 0; i < parts.length - 1; i++) {
                currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
            }

            // Создаем файл
            const fileName = parts[parts.length - 1];
            const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();

            try {
                // Упрощенная обработка содержимого
                if (contents instanceof Uint8Array) {
                    await writable.write(contents);
                } else if (contents instanceof Blob) {
                    const arrayBuffer = await contents.arrayBuffer();
                    await writable.write(new Uint8Array(arrayBuffer));
                } else if (typeof contents === 'string') {
                    await writable.write(contents);
                } else {
                    await writable.write(contents);
                }
                
                await writable.close();
                console.log(`File ${relPath} written successfully`);
                resolve();
            } catch (writeError) {
                await writable.close();
                reject(writeError);
            }
        } catch (error) {
            reject(error);
        }
    });
}