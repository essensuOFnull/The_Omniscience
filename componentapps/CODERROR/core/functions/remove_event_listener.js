export default function(name,element){
	let stored=d.event_handlers.get(element);
	if(!stored||stored.name!==name)return
	/*Удаляем все обработчики событий*/
	element.removeEventListener('drop',stored.handlers.drop);
	element.removeEventListener('click',stored.handlers.click);
	stored.elements.jsonInput.removeEventListener('change',stored.handlers.change);
	/*Удаляем созданный input из DOM если был добавлен*/
	if(document.body.contains(stored.elements.jsonInput)){
		document.body.removeChild(stored.elements.jsonInput);
	}
	d.event_handlers.delete(element);
}