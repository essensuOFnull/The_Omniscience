export default function(relPath){
	return new Promise((resolve,reject)=>{
		if(!d.directory_handle)return reject(new Error('Directory handle is not available'));
		const parts=relPath.split('/').filter(Boolean);
		let dir=d.directory_handle;
		const deleteRecursive=async(currentDir)=>{
			for await(const[name,handle]of currentDir.entries()){
				if(handle.kind==='directory'){
					await deleteRecursive(handle);
				}else{
					await currentDir.removeEntry(name);
				}
			}
			if(currentDir!==d.directory_handle){
				await dir.removeEntry(parts[parts.length-1],{recursive:true});
			}
		};
		const next=(i)=>{
			if(i>=parts.length){
				deleteRecursive(dir)
				.then(resolve)
				.catch(reject);
				return;
			}
			dir.getDirectoryHandle(parts[i])
			.then(newDir=>{
				dir=newDir;
				next(i+1);
			}).catch(reject);
		};
		next(0);
	});
}