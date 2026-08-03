import _ from 'lodash';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';
{
let d=window.CODERROR.__originals__.data;

window.CODERROR.__originals__.functions={
prepare(preparation_func){
	if(!d.save.temp.room.preparation)return
	preparation_func();
	f.finish_preparation();
},
/**завершить подготовку комнаты*/
finish_preparation(){
	if(d.loadable_save_data){
		d.save=_.merge({},d.save,d.loadable_save_data);
		d.loadable_save_data=null;
		f.update_interface();
	}
	d.save.temp.room.preparation=false;
},
apply_standard_buttons_style(buttons=d.save.temp.room.data.buttons){
	Object.entries(buttons).forEach(([name,el])=>{
		f.change_button_color(el,(f.check_hover(el)?f.get_random_true_str_color():'#fff'));
	});
},
apply_standard_drop_zone_style(drop_zone=d.save.temp.room.data.drop_zone){
	f.change_button_border_color(drop_zone,(f.check_hover(drop_zone)?'#f0f':'#fff'));
},
set_empty_player(){
	d.save.player={
		/**ник персонажа*/
		nickname:'',
		interface:{
			hotbar:{
				slot_count:0,
				active_slot_index:0
			}
		}
	}
},
render_player(player=_.get(d,['save','player'])){
	let basePath=['save','world','players',player.nickname],
	player_nickname=_.get(player,['nickname']);
	//Символическое представление игрока
	if(_.get(player,['is_symbolic'])){
		/*расчет скина игрока*/
		const fractional=[false,false];
		for(let i=0;i<=1;i++){
			const coord=_.get(d,[...basePath,'position','coordinates',i]);
			if(coord/d.logical_symbol_size!==Math.floor(coord/d.logical_symbol_size)){
				fractional[i]=true;
			}
		}
		const player_skin=(fractional[0]?(fractional[1]?'▗▖\n▝▘':'▐▌'):(fractional[1]?'▄\n▀':'█'));
		/*отрисовка игрока*/
		f.focus_camera_on_player();
		const coord0=_.get(d,[...basePath,'position','coordinates',0]);
		const coord1=_.get(d,[...basePath,'position','coordinates',1]);
		let rendering_coordinates=[f.logical_to_screen(coord0)-(_.get(d,['save','temp','camera',0])||d.save.temp.camera&&d.save.temp.camera[0]||0),f.logical_to_screen(coord1)-(_.get(d,['save','temp','camera',1])||d.save.temp.camera&&d.save.temp.camera[1]||0)];
		if(fractional[0]) rendering_coordinates[0]--;
		if(fractional[1]) rendering_coordinates[1]--;
		f.print_text_to_symbols_grid(player_skin,rendering_coordinates[0]/d.symbol_size,rendering_coordinates[1]/d.symbol_size);
	}
	//Ник над персонажем — создаётся один раз и потом только перемещается
	if(!d.nickname_labels)d.nickname_labels=new Map();
	//Вычисляем центр верхней границы коллайдера в логических координатах
	let collider=[...basePath,'position','collider'],
	x=(_.get(d,[...collider,0,0])+_.get(d,[...collider,1,0]))/2,
	y=_.get(d,[...collider,0,1]);
	//Переводим в экранные пиксели
	let camera=['save','temp','camera'],
	screen_x=Math.round(f.logical_to_screen(x)-_.get(d,[...camera,0],0)),
	screen_y=Math.round(f.logical_to_screen(y)-_.get(d,[...camera,1],0));
	//Смещаем надпись над головой на расстояние d.symbol_size
	screen_y-=d.symbol_size;

	let label = d.nickname_labels.get(player_nickname);
	if(!label){
		// Создаём контейнер с фоном и текстом (полупрозрачный чёрный фон, alpha = 0.5)
		let container = new PIXI.Container();
		let font_size = d.symbol_size;
		let nick_text = player_nickname ? String(player_nickname) : '';
		let text = new PIXI.Text(nick_text, {
			fontFamily: 'CODERROR',
			fontSize: font_size,
			fill: 0xFFFFFF,
			align: 'center'
		});

		// Use a conservative resolution (based on devicePixelRatio) instead of a large fixed value
		text.resolution = Math.max(1, Math.round(window.devicePixelRatio || 1));
		text.roundPixels = true;
		if(text.anchor) text.anchor.set(0.5, 1);
		else text.pivot.set(text.width/2, text.height);

		let paddingX = Math.ceil(d.symbol_size * 0.4);
		let paddingY = Math.ceil(d.symbol_size * 0.25);
		let bounds = text.getLocalBounds();
		let bg = new PIXI.Graphics();

		bg.beginFill(0x000000, 0.5);
		bg.drawRoundedRect(-bounds.width/2 - paddingX, -bounds.height - paddingY, bounds.width + paddingX*2, bounds.height + paddingY*1.5, Math.max(2, paddingY));
		bg.endFill();

		container.addChild(bg);
		container.addChild(text);

		// store references and paddings for later updates
		container._bg = bg;
		container._text = text;
		container._paddingX = paddingX;
		container._paddingY = paddingY;

		d.app.stage.addChild(container);
		d.nickname_labels.set(player_nickname, container);
		label = container;
	} else {
		// If nickname text changed (rare), update text and re-cache the bitmap
		let t = label._text;
		let desired = player_nickname ? String(player_nickname) : '';
		if(t.text !== desired){
			try{
				t.cacheAsBitmap = false;
			}catch(e){}
			t.text = desired;
			// redraw background size to fit new bounds
			let paddingX = label._paddingX || Math.ceil(d.symbol_size * 0.4);
			let paddingY = label._paddingY || Math.ceil(d.symbol_size * 0.25);
			let bounds = t.getLocalBounds();
			label._bg.clear();
			label._bg.beginFill(0x000000, 0.5);
			label._bg.drawRoundedRect(-bounds.width/2 - paddingX, -bounds.height - paddingY, bounds.width + paddingX*2, bounds.height + paddingY*1.5, Math.max(2, paddingY));
			label._bg.endFill();
			try{
				t.cacheAsBitmap = true;
				label._bg.cacheAsBitmap = true;
				label.cacheAsBitmap = true;
			}catch(e){}
		}
	}

	// Only update position if it actually changed — avoids marking transforms every frame
	if(label.position.x !== screen_x || label.position.y !== screen_y){
		label.position.set(screen_x, screen_y);
	}
},
/**инициализирует систему кастомных курсоров*/
init_cursor_system(){
	/**контейнер для кастомного курсора*/
	d.cursor = document.getElementById('cursor');
	/**текущая конфигурация курсора*/
	d.cursor_config = null;
	/**текущий способ отображения курсора*/
	d.cursor_type = null;
	
	/**обработчик для копирования cursor в data-атрибуты*/
	f.init_cursor_data_attributes();
},
/**Инициализирует data-атрибуты для курсоров*/
init_cursor_data_attributes(){
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
},
/**Обрабатывает элементы, копируя cursor в data-атрибут*/
process_elements_for_cursor(root){
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
			cursor_type = f.get_inherited_cursor(element);
		} else if(cursor_type === 'auto') {
			// Для auto используем логику браузера
			cursor_type = f.get_auto_cursor(element);
		}
		
		// Сохраняем в data-атрибут
		element.setAttribute('data-cursor', cursor_type);
		element.style.cursor = 'none';
		
		// Помечаем как обработанный
		element.setAttribute('data-cursor-processed', 'true');
	}
},
/**Получает унаследованный курсор из родительских элементов*/
get_inherited_cursor(element) {
	let parent = element.parentElement;
	while(parent && parent.nodeType === Node.ELEMENT_NODE) {
		if(parent.hasAttribute('data-cursor')) {
			return parent.getAttribute('data-cursor');
		}
		parent = parent.parentElement;
	}
	return 'default';
},
/**Определяет курсор для значения 'auto' на основе типа элемента*/
get_auto_cursor(element) {
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
},
/**Получает тип курсора из элемента и его родителей*/
get_cursor_from_element(element){
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
},
/**устанавливает курсор из указанной папки*/
set_cursor(cursor_folder_path){
	f.fetch_json(`${cursor_folder_path}/cursor_config.json`).then(config => {
		if(!config || typeof config !== 'object'){
			console.error('Неверный формат конфигурации курсора');
			return;
		}
		
		d.cursor_config = config;
		d.cursor_folder_path = cursor_folder_path;
	}).catch(error => {
		console.error('Ошибка при загрузке конфигурации курсора:', error);
	});
},
change_title(title) {
    return window.CODERROR_API.changeTitle(title);
},
init_file_access() {
    return window.CODERROR_API.fileAPI.initFileAccess();
},
file_exists(relPath) {
    return window.CODERROR_API.fileAPI.fileExists(relPath);
},
read_file(relPath, asText = true) {
    return window.CODERROR_API.fileAPI.readFile(relPath, asText);
},
write_file(relPath, content) {
    return window.CODERROR_API.fileAPI.writeFile(relPath, content);
},
create_directory(relPath) {
    return window.CODERROR_API.fileAPI.createDirectory(relPath);
},
remove_file(relPath) {
    return window.CODERROR_API.fileAPI.removeFile(relPath);
},
remove_directory(relPath) {
    return window.CODERROR_API.fileAPI.removeDirectory(relPath);
},
list_files(relPath = "") {
    return window.CODERROR_API.fileAPI.listFiles(relPath);
},
/**текущая функция логики комнаты (physics цикл)*/
current_room_physics(){
	// Функция переопределяется в change_room
},
/**текущая функция отрисовки комнаты (render цикл)*/
current_room_render(){
	// Функция переопределяется в change_room
},
/**получает информацию о системе*/
get_system_info() {
    return window.CODERROR_API.fileAPI.getSystemInfo().then(systemInfo => {
        window.CODERROR.__originals__.data.system_info = systemInfo;
        return systemInfo;
    });
},
get_midi_inputs() {
    return window.CODERROR_API.fileAPI.getMidiInputs().then(midiInputs => {
        window.CODERROR.__originals__.data.midi_inputs = midiInputs;
        console.log('Доступные MIDI входы:', window.CODERROR.__originals__.data.midi_inputs);
        return midiInputs;
    });
},
get_midi_outputs() {
    return window.CODERROR_API.fileAPI.getMidiOutputs().then(outputs => {
        window.CODERROR.__originals__.data.midi_outputs = outputs;
        console.log('Доступные MIDI выходы:', window.CODERROR.__originals__.data.midi_outputs);
        return outputs;
    });
},
/**
 * Воспроизвести MIDI-файл на указанном устройстве
 * @param {Uint8Array|ArrayBuffer} byteArray - содержимое .mid файла
 * @param {string} deviceId - идентификатор выходного MIDI-устройства
 */
play_midi(byteArray, deviceId) {
    // deviceId пока игнорируется – при необходимости можно расширить API
    return window.CODERROR_API.midiAPI.play(byteArray);
},
stop_midi() {
    return window.CODERROR_API.midiAPI.stop();
},
/** Определяет тип GPU с улучшенной логикой */
determine_GPU_type(systemInfo) {
    try {
        const gpu = systemInfo?.hardware?.gpu;
        
        if (!gpu || !gpu.renderer) {
            console.warn('GPU information not available');
            return 'unknown';
        }

        const renderer = gpu.renderer.toLowerCase();
        const vendor = gpu.vendor?.toLowerCase() || '';

        console.log('GPU Renderer:', gpu.renderer);
        console.log('GPU Vendor:', gpu.vendor);

        // Ключевые слова для дискретных видеокарт
        const discreteKeywords = [
            'nvidia', 'geforce', 'gtx', 'rtx', 'quadro', 'tesla', 
            'amd', 'radeon', 'rx', 'vega', 'radeon pro', 'radeon rx',
            'intel arc', 'arc a', 'arc',
            // Дополнительные паттерны
            'gpu', 'graphics', 'video card', 'dGPU'
        ];

        // Ключевые слова для интегрированной графики
        const integratedKeywords = [
            'intel', 'hd graphics', 'uhd graphics', 'iris', 'iris pro', 'iris plus',
            'amd radeon', 'vega', 'graphics', 'apu', 
            'microsoft basic render', 'basic display',
            'llvmpipe', 'softpipe', 'software renderer', 'cpu',
            'core i3', 'core i5', 'core i7', 'core i9', 'pentium', 'celeron'
        ];

        // Проверяем WebGL рендерер для дополнительной информации
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        let webglRenderer = '';
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                webglRenderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
            }
        }

        // Объединяем всю информацию для анализа
        const allInfo = (renderer + ' ' + vendor + ' ' + webglRenderer).toLowerCase();

        // Проверяем интегрированную графику в первую очередь (более безопасно)
        const isIntegrated = integratedKeywords.some(keyword => 
            allInfo.includes(keyword.toLowerCase())
        );

        // Проверяем дискретные карты
        const isDiscrete = discreteKeywords.some(keyword => 
            allInfo.includes(keyword.toLowerCase())
        );

        // Эвристика на основе типичных паттернов
        if (allInfo.includes('nvidia') && !allInfo.includes('integrated')) {
            return 'discrete';
        }
        if (allInfo.includes('amd') && !allInfo.includes('integrated') && !allInfo.includes('radeon graphics')) {
            return 'discrete';
        }
        if (allInfo.includes('intel arc')) {
            return 'discrete';
        }

        // Если явно интегрированная
        if (isIntegrated) {
            return 'integrated';
        }

        // Если явно дискретная
        if (isDiscrete) {
            return 'discrete';
        }

        // Дополнительные проверки по WebGL
        if (webglRenderer) {
            if (webglRenderer.includes('nvidia') || webglRenderer.includes('amd') || webglRenderer.includes('radeon')) {
                if (!webglRenderer.includes('integrated') && !webglRenderer.includes('intel')) {
                    return 'discrete';
                }
            }
        }

        // Если ничего не определили, но есть информация о рендерере
        if (renderer && renderer !== 'unknown') {
            // Если рендерер содержит упоминания о GPU, но не интегрированный
            if ((renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon')) &&
                !renderer.includes('integrated') && !renderer.includes('intel')) {
                return 'discrete';
            }
        }

        return 'unknown';
    } catch (error) {
        console.error('Error determining GPU type:', error);
        return 'unknown';
    }
},

/** Функция для принятия решения о методе рендеринга (улучшенная) */
get_rendering_method(systemInfo) {
    try {
        const gpuType = this.determine_GPU_type(systemInfo);
        
        console.log('Detected GPU type:', gpuType);
        
        // Тестируем производительность WebGL
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            return {
                method: 'cpu',
                reason: 'WebGL не поддерживается - используем программный рендеринг',
                confidence: 'high'
            };
        }

        // Проверяем возможности WebGL
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        console.log('Max texture size:', maxTextureSize);

        switch (gpuType) {
            case 'discrete':
                return {
                    method: 'gpu',
                    reason: 'Обнаружена дискретная видеокарта - используем аппаратное ускорение',
                    confidence: 'high'
                };
                
            case 'integrated':
                // Для интегрированной графики проверяем производительность
                if (maxTextureSize >= 4096) {
                    return {
                        method: 'gpu', 
                        reason: 'Интегрированная графика с хорошей поддержкой WebGL - используем аппаратное ускорение',
                        confidence: 'medium'
                    };
                } else {
                    return {
                        method: 'cpu',
                        reason: 'Интегрированная графика с ограниченными возможностями - используем программный рендеринг',
                        confidence: 'medium'
                    };
                }
                
            case 'unknown':
            default:
                // Для неизвестных GPU тестируем производительность
                if (maxTextureSize >= 2048) {
                    return {
                        method: 'gpu',
                        reason: 'Неизвестный GPU с хорошими характеристиками - пробуем аппаратное ускорение',
                        confidence: 'low'
                    };
                } else {
                    return {
                        method: 'cpu',
                        reason: 'Неизвестный GPU с ограниченными возможностями - используем безопасный режим (CPU)',
                        confidence: 'medium'
                    };
                }
        }
    } catch (error) {
        console.error('Error determining rendering method:', error);
        return {
            method: 'cpu',
            reason: 'Ошибка определения метода рендеринга - используем безопасный режим',
            confidence: 'high'
        };
    }
}
};

let f=window.CODERROR.__originals__.functions;
}
