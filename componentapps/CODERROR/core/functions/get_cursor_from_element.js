export default function(element){
	// Ищем ближайший элемент с data-cursor
	let current = element;
	while(current && current.nodeType === Node.ELEMENT_NODE){
		if(current.hasAttribute('data-cursor')){
			const cursor = current.getAttribute('data-cursor');
			// Если нашли inherit, продолжаем поиск
			if(cursor !== 'inherit') {
				return cursor;
			}
		}
		current = current.parentElement;
	}
	
	// Если не нашли, используем default
	return 'default';
}