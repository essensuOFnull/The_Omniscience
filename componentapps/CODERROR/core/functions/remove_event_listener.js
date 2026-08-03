export default function(name,element){
	let stored=window.CODERROR.__originals__.data.event_handlers.get(element);
	if(!stored||storewindow.CODERROR.__originals__.data.name!==name)return
	/*Удаляем все обработчики событий*/
	element.removeEventListener('drop',storewindow.CODERROR.__originals__.data.handlers.drop);
	element.removeEventListener('click',storewindow.CODERROR.__originals__.data.handlers.click);
	storewindow.CODERROR.__originals__.data.elements.jsonInput.removeEventListener('change',storewindow.CODERROR.__originals__.data.handlers.change);
	/*Удаляем созданный input из DOM если был добавлен*/
	if(document.body.contains(storewindow.CODERROR.__originals__.data.elements.jsonInput)){
		document.body.removeChild(storewindow.CODERROR.__originals__.data.elements.jsonInput);
	}
	window.CODERROR.__originals__.data.event_handlers.delete(element);
}