export default function(path){
	return fetch(path)
	.then(response=>{
		if(!response.ok){
			throw new Error('Ошибка сети');
		}
		return response.json();
	}).then(data=>{
		return data;// данные будут доступны через then
	}).catch(error=>{
		console.error('Ошибка загрузки файла:',error);
		throw error;// пробрасываем ошибку дальше
	});
}