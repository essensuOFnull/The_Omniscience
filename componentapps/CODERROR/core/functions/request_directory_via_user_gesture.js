export default function(){
	return new Promise((resolve,reject)=>{
		if(!window.showDirectoryPicker)return resolve(null);
		window.showDirectoryPicker().then(handle=>{
			d.directory_handle=handle;
			f.save_handle_to_DB(handle).then(()=>{
				localStorage.setItem('coderror_dir_selected','1');
			}).catch(e=>{
				console.warn('Не удалось сохранить дескриптор в IndexedDB',e);
			}).finally(()=>{
				d.need_directory_permission=false;
				resolve(handle);
			});
		}).catch(e=>{
			console.warn('showDirectoryPicker cancelled or failed',e);
			resolve(null);
		});
	});
}