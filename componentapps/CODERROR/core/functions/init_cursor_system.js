import init_cursor_data_attributes from './init_cursor_data_attributes';
export default function(){
	/**контейнер для кастомного курсора*/
	window.CODERROR.__originals__.data.cursor = document.getElementById('cursor');
	/**текущая конфигурация курсора*/
	window.CODERROR.__originals__.data.cursor_config = null;
	/**текущий способ отображения курсора*/
	window.CODERROR.__originals__.data.cursor_type = null;
	
	/**обработчик для копирования cursor в data-атрибуты*/
	init_cursor_data_attributes();
}