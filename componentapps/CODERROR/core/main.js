import init_printable_symbols from './functions/init_printable_symbols';
import generate_favicon from './functions/generate_favicon';
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

import _ from 'lodash';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';
/*для иконки*/
init_printable_symbols();
_.set(window,['CODERROR','__originals__','data','dpr'],window.devicePixelRatio||1);
/**размер иконки сайта*/
_.set(window,['CODERROR','__originals__','data','favicon','size'],Math.round(16*window.CODERROR.__originals__.data.dpr));
/**холст иконки сайта*/
_.set(window,['CODERROR','__originals__','data','favicon','canvas'],document.createElement('canvas'));
_.set(window,['CODERROR','__originals__','data','favicon','canvas','width'],window.CODERROR.__originals__.data.favicon.size);
_.set(window,['CODERROR','__originals__','data','favicon','canvas','height'],window.CODERROR.__originals__.data.favicon.size);
_.set(window,['CODERROR','__originals__','data','favicon','ctx'],window.CODERROR.__originals__.data.favicon.canvas.getContext('2d'));
_.set(window,['CODERROR','__originals__','data','favicon','ctx','font'],`${window.CODERROR.__originals__.data.symbol_size}px CODERROR`);
_.set(window,['CODERROR','__originals__','data','favicon','ctx','textAlign'],'center');
_.set(window,['CODERROR','__originals__','data','favicon','ctx','textBaseline'],'middle');
/**ссылка на элемент иконки*/
window.CODERROR.__originals__.data.favicon.link=document.querySelector('link[rel="icon"]');
/**автообновлятель иконки сайта*/
window.CODERROR.__originals__.data.favicon.interval=setInterval(()=>{
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

import('../manifest.json').then(manifest=>{
	/**манифест расширения*/
	window.CODERROR.__originals__.data.manifest=manifest;
});
/**получение данных о системе*/
get_system_info();
/*определяем стоит ли использовать GPU*/
let rendering_info = get_rendering_method(window.CODERROR.__originals__.data.system_info);
window.CODERROR.__originals__.data.gpu_enabled=(rendering_info.method=='gpu');
console.log('GPU enabled:', window.CODERROR.__originals__.data.gpu_enabled);
window.CODERROR.__originals__.data.gpu_initialized=false;
/**дожидаемся загрузки шрифта*/
check_font_loaded('CODERROR').then(() => {
	/**приложение PIXI.js*/
	window.CODERROR.__originals__.data.app=new PIXI.Application({});
	window.CODERROR.__originals__.data.app.init().then(()=>{
		window.CODERROR.__originals__.data.styleSheet=document.styleSheets[0];
		/**обёртка в которой лежит весь интерфейс*/
		window.CODERROR.__originals__.data.wrapper=document.getElementById('wrapper');
		/*инициализация сцены*/
		/**сцена THREE.js*/
		window.CODERROR.__originals__.data.three_scene=new THREE.Scene();
		window.CODERROR.__originals__.data.three_scene.background=null;
		window.CODERROR.__originals__.data.three_camera;
		init_three_camera();
		window.CODERROR.__originals__.data.three_renderer=new THREE.WebGLRenderer({alpha:true});
		window.CODERROR.__originals__.data.three_renderer.shadowMap.enabled=false;/*отключаем тени*/
		/**загрузчик для текстур THREE.js*/
		window.CODERROR.__originals__.data.texture_loader=new THREE.TextureLoader();
		/**небо (коробка)*/
		window.CODERROR.__originals__.data.skybox;
		/**текущий путь до текстур неба*/
		window.CODERROR.__originals__.data.current_sky_path;
		/*добавление в основной canvas canvas-а three*/
		window.CODERROR.__originals__.data.background_texture;
		window.CODERROR.__originals__.data.background_sprite;
		init_three_scene();
		update_three_scene();
		/*отслеживание координат мыши*/
		/**данные о курсоре мыши*/
		window.CODERROR.__originals__.data.mouse={x:0,y:0};
		// Флаг, что нужно применить позицию курсора в основном цикле рендера
		window.CODERROR.__originals__.data._cursorNeedsUpdate = false;
		// Установим подсказку браузеру про ожидаемое изменение — помогает оптимизировать
		const ensureCursorWillChange = ()=>{
			try{ if(window.CODERROR.__originals__.data.cursor) window.CODERROR.__originals__.data.cursor.style.willChange = 'transform'; }catch(e){}
		};

		document.addEventListener('mousemove',(event)=>{
			if(!window.has_focus&&window.CODERROR.__originals__.data.settings.interface.pause_on_blur) return;
			/*вычисляем глобальные координаты мыши*/
			window.CODERROR.__originals__.data.mouse.x_global=event.clientX;
			window.CODERROR.__originals__.data.mouse.y_global=event.clientY;
			/*вычисляем координаты мыши относительно обертки*/
			const rect=window.CODERROR.__originals__.data.wrapper.getBoundingClientRect();
			window.CODERROR.__originals__.data.mouse.x=window.CODERROR.__originals__.data.mouse.x_global-rect.left;
			window.CODERROR.__originals__.data.mouse.y=window.CODERROR.__originals__.data.mouse.y_global-rect.top;
			/*для кастомного курсора*/
			if(!window.CODERROR.__originals__.data.cursor || !window.CODERROR.__originals__.data.cursor_config) return;

			let element = event.target;
			let cursor_type = get_cursor_from_element(element);
			if(!window.CODERROR.__originals__.data.cursor_config[cursor_type]) cursor_type = 'default';

			// Вычисляем целевые координаты (без записи в layout)
			const x = window.CODERROR.__originals__.data.mouse.x_global - _.get(window.CODERROR.__originals__.data,['cursor_config', cursor_type, 'hotspot_x']);
			const y = window.CODERROR.__originals__.data.mouse.y_global - _.get(window.CODERROR.__originals__.data,['cursor_config', cursor_type, 'hotspot_y']);
			window.CODERROR.__originals__.data._cursorTargetX = Math.round(x);
			window.CODERROR.__originals__.data._cursorTargetY = Math.round(y);
			// Помечаем, что позицию курсора надо применить на следующем кадре рендера
			window.CODERROR.__originals__.data._cursorNeedsUpdate = true;

			// Обновление изображения курсора только при смене типа
			if(window.CODERROR.__originals__.data.cursor_type === cursor_type) return;
			let cursor_file_path = _.get(window.CODERROR.__originals__.data,['cursor_config', cursor_type, 'file']);
			window.CODERROR.__originals__.data.cursor.src = cursor_file_path ? `${window.CODERROR.__originals__.data.cursor_folder_path}/${cursor_file_path}` : '';
			window.CODERROR.__originals__.data.cursor_type = cursor_type;
		});
		/*добавление в разметку canvas-а pixijs*/
		window.CODERROR.__originals__.data.wrapper.appendChild(window.CODERROR.__originals__.data.app.view);
		/**контейнер для HTML поверх canvas-ов*/
		window.CODERROR.__originals__.data.overlay=document.createElement('div');
		window.CODERROR.__originals__.data.overlay.id='html-overlay';
		window.CODERROR.__originals__.data.wrapper.appendChild(window.CODERROR.__originals__.data.overlay);
		/**контейнер дя предпросмотра чата*/
		window.CODERROR.__originals__.data.chat_preview=document.createElement('div');
		window.CODERROR.__originals__.data.chat_preview.id='chat_preview';
		window.CODERROR.__originals__.data.wrapper.appendChild(window.CODERROR.__originals__.data.chat_preview);
		/**контейнер для интерфейса*/
		window.CODERROR.__originals__.data.interface=document.createElement('div');
		window.CODERROR.__originals__.data.interface.id='interface';
		window.CODERROR.__originals__.data.wrapper.appendChild(window.CODERROR.__originals__.data.interface);
		/**сетка символов PIXI js*/
		window.CODERROR.__originals__.data.symbols_grid;
		/**количество колонок сетки символов*/
		window.CODERROR.__originals__.data.columns;
		/**количество строк сетки символов*/
		window.CODERROR.__originals__.data.rows;
		/*инициализируем символы*/
		init_printable_symbols();
		/**отображаемый размер шрифта*/
		window.CODERROR.__originals__.data.symbol_size;
		set_font_size(16,true);
		/**/
		window.addEventListener('resize',update_size);
		window.CODERROR.__originals__.data.dragover_states=new WeakMap();
		window.CODERROR.__originals__.data.event_handlers=new WeakMap();
		/**текущая музыка*/
		window.CODERROR.__originals__.data.current_music=null;
		/**путь до файла текущей музыки*/
		window.CODERROR.__originals__.data.current_music_path='';
		/**громкость музыки*/
		window.CODERROR.__originals__.data.music_volume=0.5;
		/**инициализирована ли музыка*/
		window.CODERROR.__originals__.data.audio_initialized=false;
		document.addEventListener('click',init_audio);
		/**нажатые клавиши*/
		window.CODERROR.__originals__.data.pressed=new Set();
		/**активированные действия персонажа*/
		window.CODERROR.__originals__.data.activated_actions=new Set();
		/**данные сохранения которые должны быть загружены*/
		window.CODERROR.__originals__.data.loadable_save_data=null;
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
		window.CODERROR.__originals__.data.input_tracker=setup_input_tracker();
		/**логический размер символов, используемый в физике*/
		window.CODERROR.__originals__.data.logical_symbol_size=16;
		update_size();
		/*перехдим вначальную комнату*/
		change_room('disclaimer');
		/*загружаем циклы физики и отрисовки*/
		import('./physics.js');
		import('./render.js');
	}).catch(console.error);
}).catch(console.error);

window.CODERROR.CHEATING.data=window.CODERROR.__originals__.data;