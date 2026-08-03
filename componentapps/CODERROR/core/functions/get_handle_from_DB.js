import open_handles_DB from './open_handles_DB';
export default function(){
    return open_handles_DB().then(db => new Promise((resolve, reject) => {
		try{
			const tx = db.transaction(window.CODERROR.__originals__.data.FS_STORE_NAME, 'readonly');
			const store = tx.objectStore(window.CODERROR.__originals__.data.FS_STORE_NAME);
			const req = store.get(window.CODERROR.__originals__.data.FS_KEY);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		}catch(e){
			reject(e);
		}
	}));
}