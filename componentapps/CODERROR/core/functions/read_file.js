export default function(relPath, asText = true) {
    return new Promise((resolve, reject) => {
        if (!d.directory_handle) return reject(new Error('Directory handle is not available'));
        const parts = relPath.split('/').filter(Boolean);
        let dir = d.directory_handle;
        const next = (i) => {
            if (i >= parts.length - 1) {
                dir.getFileHandle(parts[parts.length - 1])
                    .then(fileHandle => fileHandle.getFile())
                    .then(file => asText ? file.text() : file.arrayBuffer())
                    .then(resolve)
                    .catch(error => {
                        if (error.name === 'NotFoundError') {
                            resolve(null);
                        } else {
                            reject(error);
                        }
                    });
                return;
            }
            dir.getDirectoryHandle(parts[i])
                .then(newDir => {
                    dir = newDir;
                    next(i + 1);
                })
                .catch(error => {
                    if (error.name === 'NotFoundError') {
                        resolve(null);
                    } else {
                        reject(error);
                    }
                });
        };
        next(0);
    });
}