import list_files from './list_files';
export default async function(){
	try{
		window.CODERROR.__originals__.data.characters=[];
		const files=await list_files('YOUR_DATA/characters');
		// Загружаем всех персонажей параллельно
		const characterPromises=files.map(file=>
			this.load_character(file)
		);
		const characters=await Promise.all(characterPromises);
		// Добавляем всех персонажей в массив
		window.CODERROR.__originals__.data.characters.unshift(...characters);
		return characters;
	}catch(error){
		console.error('Ошибка загрузки персонажей:', error);
		throw error;
	}
}