export default function(relPath){
	return new Promise((resolve,reject)=>{
		if(!d.directory_handle)return reject(new Error('Directory handle is not available'));
		const parts=relPath.split('/').filter(Boolean);
		let dir=d.directory_handle;
		const next=(i)=>{
			if(i>=parts.length-1){
				dir.removeEntry(parts[parts.length-1])
				.then(resolve)
				.catch(reject);
				return;
			}
			dir.getDirectoryHandle(parts[i])
			.then(newDir=>{
				dir=newDir;
				next(i+1);
			})
			.catch(reject);
		};
		next(0);
	});
}