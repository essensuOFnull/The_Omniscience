export default function(relPath){
	return new Promise((resolve,reject)=>{
		if(!d.directory_handle)return reject(new Error('Directory handle is not available'));
		const parts=relPath.split('/').filter(Boolean);
		let dir=d.directory_handle;
		const next=(i)=>{
			if(i>=parts.length){
				// Достигли целевой директории - читаем её содержимое
				const files=[];
				const readFiles=async()=>{
					try{
						for await(const[name,handle]of dir.entries()){
							// Добавляем только файлы, игнорируем папки
							if(handle.kind==='file'){
								files.push(name);
							}
						}
						resolve(files.sort());
					}catch(error){
						reject(error);
					}
				};
				readFiles();
				return;
			}
			dir.getDirectoryHandle(parts[i])
			.then(newDir=>{
				dir=newDir;
				next(i+1);
			}).catch(error=>{
				if(error.name==='NotFoundError'){
					// Директория не существует - возвращаем пустой массив
					resolve([]);
				}else{
					reject(error);
				}
			});
		};
		next(0);
	});
}