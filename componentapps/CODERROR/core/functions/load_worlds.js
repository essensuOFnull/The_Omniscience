import list_files from './list_files';
export default async function(){
	try{
		window.CODERROR.__originals__.data.worlds=[];
		const files=await list_files('YOUR_DATA/worlds');
		const worldPromises=files.map(file=>
			this.load_world(file)
		);
		const worlds=await Promise.all(worldPromises);
		window.CODERROR.__originals__.data.worlds.unshift(...worlds);
		return worlds;
	}catch(error){
		console.error('Ошибка загрузки миров:',error);
		throw error;
	}
}