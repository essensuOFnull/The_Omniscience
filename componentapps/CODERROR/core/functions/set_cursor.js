import fetch_json from './fetch_json';
export default function(cursor_folder_path){
	fetch_json(`${cursor_folder_path}/cursor_config.json`).then(config => {
		if(!config || typeof config !== 'object'){
			console.error('Неверный формат конфигурации курсора');
			return;
		}
		
		window.CODERROR.__originals__.data.cursor_config = config;
		window.CODERROR.__originals__.data.cursor_folder_path = cursor_folder_path;
	}).catch(error => {
		console.error('Ошибка при загрузке конфигурации курсора:', error);
	});
}