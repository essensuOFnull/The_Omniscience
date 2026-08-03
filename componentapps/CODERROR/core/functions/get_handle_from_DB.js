export default function(){
    return f.open_handles_DB().then(db => new Promise((resolve, reject) => {
		try{
			const tx = db.transaction(d.FS_STORE_NAME, 'readonly');
			const store = tx.objectStore(d.FS_STORE_NAME);
			const req = store.get(d.FS_KEY);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		}catch(e){
			reject(e);
		}
	}));
}