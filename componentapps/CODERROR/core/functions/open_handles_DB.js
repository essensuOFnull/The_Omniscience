export default function(){
    return new Promise((resolve, reject) => {
		const req = indexedDB.open(d.FS_DB_NAME, 1);
		req.onupgradeneeded = (e) => {
			const db = e.target.result;
			if (!db.objectStoreNames.contains(d.FS_STORE_NAME)) db.createObjectStore(d.FS_STORE_NAME);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}