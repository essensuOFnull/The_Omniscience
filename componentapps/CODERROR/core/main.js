import init_printable_symbols from './functions/init_printable_symbols';
import generate_favicon from './functions/generate_favicon';
import fetch_json from './functions/fetch_json';
import get_system_info from './functions/get_system_info';
import get_rendering_method from './functions/get_rendering_method';
import check_font_loaded from './functions/check_font_loaded';
import init_three_camera from './functions/init_three_camera';
import init_three_scene from './functions/init_three_scene';
import update_three_scene from './functions/update_three_scene';
import get_cursor_from_element from './functions/get_cursor_from_element';
import set_font_size from './functions/set_font_size';
import update_size from './functions/update_size';
import init_audio from './functions/init_audio';
import set_empty_player from './functions/set_empty_player';
import apply_settings from './functions/apply_settings';
import init_cursor_system from './functions/init_cursor_system';
import set_cursor from './functions/set_cursor';
import setup_input_tracker from './functions/setup_input_tracker';
import change_room from './functions/change_room';
import eval_script from './functions/eval_script';
{
let d=window.CODERROR.__originals__.data;

/*для иконки*/
init_printable_symbols();
d.dpr=window.devicePixelRatio||1;
/**размер иконки сайта*/
d.favicon.size=Math.round(16*d.dpr);
/**холст иконки сайта*/
d.favicon.canvas=document.createElement('canvas');
d.favicon.canvas.width=d.favicon.size;
d.favicon.canvas.height=d.favicon.size;
d.favicon.ctx=d.favicon.canvas.getContext('2d');
d.favicon.ctx.font=`${d.symbol_size}px CODERROR`;
d.favicon.ctx.textAlign='center';
d.favicon.ctx.textBaseline='middle';
/**ссылка на элемент иконки*/
d.favicon.link=document.querySelector('link[rel="icon"]');
/**автообновлятель иконки сайта*/
d.favicon.interval=setInterval(()=>{
    generate_favicon();
},1000/5);

// ========== ОБРАБОТЧИКИ ФОКУСА ОКНА ==========
window.has_focus = true;
window.addEventListener('focus', function() {
	window.has_focus = true;
});
window.addEventListener('blur', function() {
	window.has_focus = false;
});
/**получение манифеста*/
fetch_json('../../../componentapps/CODERROR/manifest.json').then(manifest=>{
	/**манифест расширения*/
	d.manifest=manifest;
});
/**получение данных о системе*/
get_system_info();
/*определяем стоит ли использовать GPU*/
let rendering_info = get_rendering_method(d.system_info);
d.gpu_enabled=(rendering_info.method=='gpu');
console.log('GPU enabled:', d.gpu_enabled);
d.gpu_initialized=false;
/**дожидаемся загрузки шрифта*/
check_font_loaded('CODERROR').then(() => {
	/**приложение PIXI.js*/
	d.app=new PIXI.Application({});
	d.app.init().then(()=>{
		d.styleSheet=document.styleSheets[0];
		/**обёртка в которой лежит весь интерфейс*/
		d.wrapper=document.getElementById('wrapper');
		/*инициализация сцены*/
		/**сцена THREE.js*/
		d.three_scene=new THREE.Scene();
		d.three_scene.background=null;
		d.three_camera;
		init_three_camera();
		d.three_renderer=new THREE.WebGLRenderer({alpha:true});
		d.three_renderer.shadowMap.enabled=false;/*отключаем тени*/
		/**загрузчик для текстур THREE.js*/
		d.texture_loader=new THREE.TextureLoader();
		/**небо (коробка)*/
		d.skybox;
		/**текущий путь до текстур неба*/
		d.current_sky_path;
		/*добавление в основной canvas canvas-а three*/
		d.background_texture;
		d.background_sprite;
		init_three_scene();
		update_three_scene();
		/*отслеживание координат мыши*/
		/**данные о курсоре мыши*/
		d.mouse={x:0,y:0};
		// Флаг, что нужно применить позицию курсора в основном цикле рендера
		d._cursorNeedsUpdate = false;
		// Установим подсказку браузеру про ожидаемое изменение — помогает оптимизировать
		const ensureCursorWillChange = ()=>{
			try{ if(d.cursor) d.cursor.style.willChange = 'transform'; }catch(e){}
		};

		document.addEventListener('mousemove',(event)=>{
			if(!window.has_focus&&d.settings.interface.pause_on_blur) return;
			/*вычисляем глобальные координаты мыши*/
			d.mouse.x_global=event.clientX;
			d.mouse.y_global=event.clientY;
			/*вычисляем координаты мыши относительно обертки*/
			const rect=d.wrapper.getBoundingClientRect();
			d.mouse.x=d.mouse.x_global-rect.left;
			d.mouse.y=d.mouse.y_global-rect.top;
			/*для кастомного курсора*/
			if(!d.cursor || !d.cursor_config) return;

			let element = event.target;
			let cursor_type = get_cursor_from_element(element);
			if(!d.cursor_config[cursor_type]) cursor_type = 'default';

			// Вычисляем целевые координаты (без записи в layout)
			const x = d.mouse.x_global - _.get(d,['cursor_config', cursor_type, 'hotspot_x']);
			const y = d.mouse.y_global - _.get(d,['cursor_config', cursor_type, 'hotspot_y']);
			d._cursorTargetX = Math.round(x);
			d._cursorTargetY = Math.round(y);
			// Помечаем, что позицию курсора надо применить на следующем кадре рендера
			d._cursorNeedsUpdate = true;

			// Обновление изображения курсора только при смене типа
			if(d.cursor_type === cursor_type) return;
			let cursor_file_path = _.get(d,['cursor_config', cursor_type, 'file']);
			d.cursor.src = cursor_file_path ? `${d.cursor_folder_path}/${cursor_file_path}` : '';
			d.cursor_type = cursor_type;
		});
		/*добавление в разметку canvas-а pixijs*/
		d.wrapper.appendChild(d.app.view);
		/**контейнер для HTML поверх canvas-ов*/
		d.overlay=document.createElement('div');
		d.overlay.id='html-overlay';
		d.wrapper.appendChild(d.overlay);
		/**контейнер дя предпросмотра чата*/
		d.chat_preview=document.createElement('div');
		d.chat_preview.id='chat_preview';
		d.wrapper.appendChild(d.chat_preview);
		/**контейнер для интерфейса*/
		d.interface=document.createElement('div');
		d.interface.id='interface';
		d.wrapper.appendChild(d.interface);
		/**сетка символов PIXI js*/
		d.symbols_grid;
		/**количество колонок сетки символов*/
		d.columns;
		/**количество строк сетки символов*/
		d.rows;
		/*инициализируем символы*/
		init_printable_symbols();
		/**отображаемый размер шрифта*/
		d.symbol_size;
		set_font_size(16,true);
		/**/
		window.addEventListener('resize',update_size);
		d.dragover_states=new WeakMap();
		d.event_handlers=new WeakMap();
		/**текущая музыка*/
		d.current_music=null;
		/**путь до файла текущей музыки*/
		d.current_music_path='';
		/**громкость музыки*/
		d.music_volume=0.5;
		/**инициализирована ли музыка*/
		d.audio_initialized=false;
		document.addEventListener('click',init_audio);
		/**нажатые клавиши*/
		d.pressed=new Set();
		/**активированные действия персонажа*/
		d.activated_actions=new Set();
		/**данные сохранения которые должны быть загружены*/
		d.loadable_save_data=null;
		/*отключаем контекстные меню глобально. я сам ими пользовался для вызова консоли, но они могут помешать игре, если что-то забинжено на правую кнопку мыши. используйте F12*/
		document.addEventListener('contextmenu',(e)=>{
			e.preventDefault();
		});
		set_empty_player();
		apply_settings();
		/**инициализация системы кастомных курсоров*/
		init_cursor_system();
		/**загрузка курсора по умолчанию*/
		set_cursor('images/interface/cursors/default');
		/**прослушиватель нажатий клавиш*/
		d.input_tracker=setup_input_tracker();
		/**логический размер символов, используемый в физике*/
		d.logical_symbol_size=16;
		update_size();
		/*перехдим вначальную комнату*/
		change_room('disclaimer');
		/*загружаем циклы физики и отрисовки*/
		eval_script(`core/CODERROR/physics.js`);
		eval_script(`core/CODERROR/render.js`);
	}).catch(console.error);
}).catch(console.error);

window.CODERROR.CHEATING.data=window.CODERROR.__originals__.data;
}