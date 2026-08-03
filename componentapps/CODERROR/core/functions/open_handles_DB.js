export default function(){
    return new Promise((resolve, reject) => {
		const req = indexedDB.open(window.CODERROR.__originals__.data.FS_DB_NAME, 1);
		req.onupgradeneeded = (e) => {
			const db = e.target.result;
			if (!db.objectStoreNames.contains(window.CODERROR.__originals__.data.FS_STORE_NAME)) db.createObjectStore(window.CODERROR.__originals__.data.FS_STORE_NAME);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}