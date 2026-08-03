export default function(relPath){
	return new Promise((resolve,reject)=>{
		if(!d.directory_handle)return reject(new Error('Directory handle is not available'));
		const parts=relPath.split('/').filter(Boolean);
		let dir=d.directory_handle;
		const next=(i)=>{
			if(i>=parts.length)return resolve(dir);
			dir.getDirectoryHandle(parts[i],{create:true})
			.then(newDir=>{
				dir=newDir;
				next(i+1);
			})
			.catch(reject);
		};
		next(0);
	});
}