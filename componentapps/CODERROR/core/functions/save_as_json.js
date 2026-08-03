import object_to_string from './object_to_string';
export default function(data,filename){
	/*Преобразуем объект в JSON строку*/
	let jsonString=object_to_string(data);
	/*Создаем Blob из JSON строки*/
	let blob=new Blob([jsonString],{type:"application/json"});
	/*Создаем ссылку на объект Blob*/
	let url=URL.createObjectURL(blob);
	/*Создаем временную ссылку для скачивания*/
	let a=document.createElement("a");
	a.href=url;
	a.download=filename;
	a.style.display='none';
	/*Инициализируем клик по ссылке*/
	document.body.appendChild(a);
	a.click();
	/*Удаляем ссылку и освобождаем URL*/
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	/*уведомление*/
	alert(window.CODERROR.__originals__.data.language.alerts.file_saved(filename));
}