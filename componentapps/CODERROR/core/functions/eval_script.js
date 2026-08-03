export default async function(filePath){
    try {
		// Загружаем файл по указанному пути
		const response = await fetch(filePath);
		
		if (!response.ok) {
		throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);
		}
		
		// Получаем код из файла
		const code = await response.text();
		
		// Выполняем код с помощью eval
		eval(code);
	} catch (error) {
		console.error('Произошла ошибка:', error);
	}
}