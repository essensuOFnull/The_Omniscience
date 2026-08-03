import get_handle_from_DB from './get_handle_from_DB';
import verify_permission from './verify_permission';
import request_directory_via_user_gesture from './request_directory_via_user_gesture';
export default function(){
	// Функция возвращает Promise, чтобы вызвать её из main.js и продолжать после получения дескриптора
	return new Promise((resolve,reject)=>{
		// Если API не поддерживается — выходим молча
		if(!window.showDirectoryPicker||!window.indexedDB)return resolve();
		const flag=localStorage.getItem('coderror_dir_selected');
		const tryGetFromDB=()=>{
			if(!flag)return Promise.resolve(null);
			return get_handle_from_DB().catch(e=>{
				console.warn('Не удалось взять дескриптор из DB',e);
				localStorage.removeItem('coderror_dir_selected');
				return null;
			});
		};
		tryGetFromDB().then(storedHandle=>{
			if(storedHandle){
				// Проверим права
				verify_permission(storedHandle,true).then(ok=>{
					if(!ok)console.warn('Нет прав на выбранную папку или пользователь отозвал доступ.');
					d.directory_handle=storedHandle;
					resolve();
				}).catch(e=>{
					console.warn(e);d.directory_handle=storedHandle;resolve();
				});
				return;
			}
			// Нет сохранённого дескриптора — уведомим пользователя и пометим, что требуется вмешательство пользователя
			alert('Для работы игре требуется доступ к своим же файлам. Выберите папку, которую вы использовали для загрузки расширения, или папку, в которой игра на самом деле хранится. Сейчас будет произведён запрос доступа.');
			// Помечаем, что для получения дескриптора требуется пользовательский жест (например, нажатие кнопки)
			d.need_directory_permission=true;
			request_directory_via_user_gesture().then(handle=>{
				return resolve();
			});
		}).catch(e=>{
			console.error('init_file_access error',e);
			resolve();
		});
	});
}