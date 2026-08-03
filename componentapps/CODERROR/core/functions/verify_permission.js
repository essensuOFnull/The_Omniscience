export default function(handle, withWrite) {
	const opts = {};
	if (withWrite) opts.mode = 'readwrite';
	// Возвращаем Promise<boolean>
	try {
		return Promise.resolve().then(()=>{
			if (!handle.queryPermission) return false;
			return handle.queryPermission(opts);
		}).then(result => {
			if (result === 'granted') return true;
			if (!handle.requestPermission) return false;
			return handle.requestPermission(opts).then(r => r === 'granted');
		}).catch(e => { console.warn('verify_permission error', e); return false; });
	} catch (e) {
		console.warn('verify_permission sync error', e);
		return Promise.resolve(false);
	}
}