import get_inherited_cursor from './get_inherited_cursor';
import get_auto_cursor from './get_auto_cursor'; //спасибо копилол
export default function(root){
	// Получаем все элементы, включая сам root
	const elements = [root, ...root.querySelectorAll('*')];
	
	// Обходим в обратном порядке (снизу вверх) для правильного наследования
	for(let i = elements.length - 1; i >= 0; i--){
		let element = elements[i];
		// Пропускаем уже обработанные элементы
		if(element.hasAttribute('data-cursor-processed')) continue;
		
		// Получаем вычисленный курсор
		const computed_style = window.getComputedStyle(element);
		let cursor_type = computed_style.getPropertyValue('cursor');
		
		// Обрабатываем специальные случаи
		if(cursor_type === 'inherit') {
			// Для inherit находим родительский data-cursor
			cursor_type = get_inherited_cursor(element);
		} else if(cursor_type === 'auto') {
			// Для auto используем логику браузера
			cursor_type = get_auto_cursor(element);
		}
		
		// Сохраняем в data-атрибут
		element.setAttribute('data-cursor', cursor_type);
		element.style.cursor = 'none';
		
		// Помечаем как обработанный
		element.setAttribute('data-cursor-processed', 'true');
	}
}