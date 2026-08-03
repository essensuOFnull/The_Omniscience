export default function(){
	// Обрабатываем существующие элементы
	f.process_elements_for_cursor(document.documentElement);
	
	// Наблюдаем за новыми элементами
	const observer = new MutationObserver((mutations) => {
		for(let mutation of mutations){
			for(let node of mutation.addedNodes){
				if(node.nodeType === Node.ELEMENT_NODE){
					f.process_elements_for_cursor(node);
				}
			}
		}
	});
	
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
}