export default async function(){
	try{
		d.worlds=[];
		const files=await f.list_files('YOUR_DATA/worlds');
		const worldPromises=files.map(file=>
			this.load_world(file)
		);
		const worlds=await Promise.all(worldPromises);
		d.worlds.unshift(...worlds);
		return worlds;
	}catch(error){
		console.error('Ошибка загрузки миров:',error);
		throw error;
	}
}