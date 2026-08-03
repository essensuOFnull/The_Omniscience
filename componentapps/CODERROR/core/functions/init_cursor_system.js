export default function(){
	/**контейнер для кастомного курсора*/
	d.cursor = document.getElementById('cursor');
	/**текущая конфигурация курсора*/
	d.cursor_config = null;
	/**текущий способ отображения курсора*/
	d.cursor_type = null;
	
	/**обработчик для копирования cursor в data-атрибуты*/
	f.init_cursor_data_attributes();
}