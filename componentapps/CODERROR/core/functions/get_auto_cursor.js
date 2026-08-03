export default function(element) {
	// Логика определения курсора для auto (аналогично браузерной)
	const tagName = element.tagName.toLowerCase();
	const computedStyle = window.getComputedStyle(element);
	
	// Проверяем, является ли элемент кликабельным
	if(element.onclick || 
	   element.hasAttribute('onclick') ||
	   element.closest('[onclick]') ||
	   element.matches('a, button, input[type="button"], input[type="submit"]') ||
	   computedStyle.pointerEvents === 'none') {
		return 'pointer';
	}
	
	// Проверяем, является ли элемент текстовым
	if(element.matches('input, textarea, [contenteditable="true"]') ||
	   computedStyle.userSelect === 'text') {
		return 'text';
	}
	
	// Для изображений и ссылок
	if(element.matches('img, a')) {
		return 'pointer';
	}
	
	// По умолчанию
	return 'default';
}