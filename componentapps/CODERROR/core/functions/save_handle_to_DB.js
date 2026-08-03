import open_handles_DB from './open_handles_DB';
export default function(handle){
    return open_handles_DB().then(db => new Promise((resolve, reject) => {
		try{
			const tx = db.transaction(d.FS_STORE_NAME, 'readwrite');
			const store = tx.objectStore(d.FS_STORE_NAME);
			const req = store.put(handle, d.FS_KEY);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		}catch(e){
			reject(e);
		}
	}));
}