import _ from 'lodash';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';
{
let d=window.CODERROR.__originals__.data;

window.CODERROR.__originals__.functions={
/**создает select с рамкой*/
create_select_with_frame(options,removable=false){
	let select=f.create_element_from_HTML('<select/>');
	f.set_select_options(select,options);
	select.style.margin = (-1 * d.symbol_size) + 'px';
	select.style.padding = d.symbol_size + 'px';
	select.style.marginRight='0';
	select.style.cursor='pointer';
	select.style.background='#00000000';
	let frame=f.wrap_in_frame(select,`<button style='background:#000;'/>`,removable);
	frame.style.pointerEvents='none';
	return[frame,select];
},
/**создает прозрачный пробел для горизонтального отступа*/
get_space(){
	return f.create_element_from_HTML(`<pre style='background:#00000000'> </pre>`);
},
/**превращает объект в строку*/
object_to_string(object){
	return JSON.stringify(object);
},
/**Функция для сохранения объекта как JSON файл*/
save_as_json(data,filename){
	/*Преобразуем объект в JSON строку*/
	let jsonString=f.object_to_string(data);
	/*Создаем Blob из JSON строки*/
	let blob=new Blob([jsonString],{type:"application/json"});
	/*Создаем ссылку на объект Blob*/
	let url=URL.createObjectURL(blob);
	/*Создаем временную ссылку для скачивания*/
	let a=document.createElement("a");
	a.href=url;
	a.download=filename;
	a.style.display='none';
	/*Инициализируем клик по ссылке*/
	document.body.appendChild(a);
	a.click();
	/*Удаляем ссылку и освобождаем URL*/
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	/*уведомление*/
	alert(d.language.alerts.file_saved(filename));
},
/**удаляет из списка повторяющиеся значения, оставляя в нём только их последние вхождения*/
remove_duplicates(arr){
	let seen=new Set();
	let result=[];
	/*Идем по массиву в обратном порядке*/
	for(let i=arr.length-1;i>=0;i--){
		let value=arr[i];
		if(!seen.has(value)){
			seen.add(value);
			result.push(value);
		}
	}
	/*Перевернем результат, чтобы вернуть его в правильном порядке*/
	return result.reverse();
},
/**применяет к игре настройки из d.settings*/
apply_settings(){
	f.apply_language(d.settings.interface.language);
	f.set_volume(d.settings.audio.music_volume);
	f.apply_random_splash();
	/*set_font_size(d.settings.interface.font_size);*/
	f.set_max_content_size(d.settings.interface.max_content_width,d.settings.interface.max_content_height);
	f.change_room(d.save.world.players[d.save.player.nickname].position.room_id);
},
/**создает textarea с рамкой*/
create_textarea_with_frame(placeholder='',removable=false){
	let textarea=f.create_element_from_HTML('<textarea/>');
	textarea.style.cursor='pointer';
	textarea.style.background='#00000000';
	textarea.placeholder=placeholder;
	let frame=f.wrap_in_frame(textarea,`<button style='background:#000;'/>`,removable);
	frame.addEventListener('click',(e)=>{
		textarea.focus();
	})
	return[frame,textarea];
},
/**для того чтобы музыка начинала проигрываться после нажатия на любое место страницы*/
init_audio(){
	if(d.audio_initialized)return;
	d.audio_initialized=true;
	document.removeEventListener('click',f.init_audio);
	if(!d.current_music)return
	d.current_music.play().catch(f.handle_play_error);
},
/**принимает путь до музыки и включает её*/
set_music(path){
	if(d.current_music_path===path)return;
	/*останавливаем midi*/
	f.stop_midi();
	/*останавливаем обычную музыку*/
	if(d.current_music){
		d.current_music.pause();
		d.current_music=null;
	}
	
	if(path.endsWith('.mid')){
		f.read_file(path, false).then((midiData)=>{
			f.play_midi(midiData,Object.keys(d.midi_outputs)[0]);
		});
	}else{
		d.current_music=new Audio(path);
		d.current_music.volume=d.music_volume;
		d.current_music.loop=true;
		if(d.audio_initialized){
			d.current_music.play().catch(f.handle_play_error);
		}
	}
	f.print_to_chat(d.language.notifications.current_music(path));
	d.current_music_path=path;
},
/**выводит сообщение об ошибке вывода музыки в случае её возникновения*/
handle_play_error(error){
	console.error('Playback error:',error);
},
/**устанавливает громкость*/
set_volume(volume){
	d.music_volume=Math.max(0,Math.min(1,volume));
	if(d.current_music)d.current_music.volume=d.music_volume;
},
/**меняет текст кастомной кнопки*/
change_button_text(button,text){
	button.querySelector('#frame_content').innerHTML=f.get_transparent_space_text(text);
},
/**ожидает пользовательский ввод и возвращает promise*/
wait_user_input(){
	return new Promise((resolve)=>{
		let handler=(e)=>{
			if(d.ignored_keys.includes(e.code))return
			e.preventDefault();
			document.removeEventListener('keydown',handler);
			document.removeEventListener('mousedown',handler);
			document.removeEventListener('wheel',handler);
			if(e.type==='keydown'){
				if(d.settings.control.bind_to_layout){
					resolve(e.key);
				}else{
					resolve(e.code);
				}
			}else if(e.type==='mousedown'){
				resolve(`mouse${e.button}`);
			}else if(e.type==='wheel') {
				resolve(e.deltaY<0?'WheelUp':'WheelDown');
			}
		};
	document.addEventListener('keydown',handler);
	document.addEventListener('mousedown',handler);
	document.addEventListener('wheel',handler);
	});
},
/**принимает список и возвращает случайный элемент*/
get_random_element(list){
	return list[Math.floor(Math.random()*list.length)];
},
/**устанавливает случайный сплеш*/
apply_random_splash(){
	d.splash=f.get_random_element(d.language.splashes);
},
/**очищает сцену pixijs*/
clear_pixijs(stage=d.app.stage){
	stage.removeChildren();
	d.current_sky_path=null;
},
/**отслеживает нажатия и отжатия клавиш*/
update_activated_actions(){
	d.activated_actions.clear();
	Object.entries(d.settings.control).forEach(([control_id,control])=>{
		if(control_id!='bind_to_layout'){
			for(let key of control){
				if(d.pressed.has(key)){
					d.activated_actions.add(control_id);
					break;
				}
			}
		}
	});
},
setup_input_tracker(){
	let getKey=(e)=>{
		if(e.type.startsWith('key')){
			return d.settings.control.bind_to_layout?e.key:e.code;
		}else if(e.type.startsWith('mouse')&&e.type!=='wheel'){
			return`mouse${e.button}`;
		}else if(e.type==='wheel'){
			return e.deltaY<0?'WheelUp':'WheelDown';
		}
	};
	let handleEvent=(e)=>{
		if(e.repeat||d.ignored_keys.includes(e.code))return/*Отключаем автоповтор*/
		let key=getKey(e);
		if(e.type==='keydown'||e.type==='mousedown'||e.type==='wheel'){
			d.pressed.add(key);
		}else{
			d.pressed.delete(key);
		}
		f.update_activated_actions();
	};
	document.addEventListener('keydown',handleEvent);
	document.addEventListener('keyup',handleEvent);
	document.addEventListener('mousedown',handleEvent);
	document.addEventListener('mouseup',handleEvent);
	document.addEventListener('wheel', handleEvent);
	return{
		stop_tracking:()=>{
			document.removeEventListener('keydown',handleEvent);
			document.removeEventListener('keyup',handleEvent);
			document.removeEventListener('mousedown',handleEvent);
			document.removeEventListener('mouseup',handleEvent);
			document.removeEventListener('wheel', handleEvent);
		}
	};
},
/**отрисовывает текст в d.symbols_grid*/
print_text_to_symbols_grid(text,x,y,color=0xFFFFFF,bgColor=0x000000,bgAlpha=0){
	x=Math.floor(x);
	y=Math.floor(y);
	let current_x=x,current_y=y;
	for(let symbol of text){
		if(current_x>=0&&current_x<d.columns&&current_y>=0&&current_y<d.rows){
			f.set_symbol_data(current_x, current_y, symbol, color, bgColor, bgAlpha);
		}
		if(symbol=='\n'){
			current_x=x;
			current_y++;
		}
		else{
			current_x++;
		}
	}
},
/**превращает текст в коллайдер в зависимости от размера шрифта*/
text_to_collider(text,void_symbols=['',' ']){
	let lines=text.split("\n"),collider=[];
	for(let line of lines){
		let temp_row=[];
		for(let char of line){
			temp_row.push(...Array(d.logical_symbol_size).fill(!void_symbols.includes(char)));
		}
		for(let y=0;y<d.logical_symbol_size;y++){
			collider.push([...temp_row]);
		}
	}
	return collider;
},
/**очищает d.symbols_grid*/
clear_symbols_grid(){
	for(let y=0;y<d.rows;y++){
		for(let x=0;x<d.columns;x++){
			f.set_symbol_data(x, y, '', 0xFFFFFF, 0x000000, 0);
		}
	}
},
/**выполняет скрипт*/
load_script:async function(path) {
	try {
		// Создаем модульный скрипт
		const script = document.createElement('script');
		script.src = path;
		script.type = 'text/javascript';
		
		// Ждем загрузки скрипта
		await new Promise((resolve, reject) => {
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
		});
		
		console.log(`Script loaded: ${path}`);
	} catch (error) {
		console.error(`Failed to load script: ${path}`, error);
	}
},
/**переводит логические координаты в координаты на экране*/
logical_to_screen(num){
	return num/d.logical_symbol_size*d.symbol_size;
},
/**настройки камеры*/
focus_camera_on_player(){
	d.save.temp.camera=[f.logical_to_screen(d.save.world.players[d.save.player.nickname].position.coordinates[0])-(Math.floor(d.columns/2)*d.symbol_size),f.logical_to_screen(d.save.world.players[d.save.player.nickname].position.coordinates[1])-(Math.floor(d.rows/2)*d.symbol_size)];
},
/**расчет коллайдеров*/
update_player_collider(){
	d.save.world.players[d.save.player.nickname].position.collider=[[d.save.world.players[d.save.player.nickname].position.coordinates[0],d.save.world.players[d.save.player.nickname].position.coordinates[1]],[d.save.world.players[d.save.player.nickname].position.coordinates[0]+d.logical_symbol_size,d.save.world.players[d.save.player.nickname].position.coordinates[1]+d.logical_symbol_size]];
},
/**расчет коллизии*/
update_collision(ground_collider=d.save.temp.ground.collider){
	f.update_player_collider();
	let nickname=d.save.player.nickname,
	position=['save','world','players',nickname,'position'],
	touch_wall=[...position,'touch_wall'],
	collider=[...position,'collider'];
	_.set(d,touch_wall,{
		/**упирается ли игрок в стену снизу*/
		below:false,
		/**упирается ли игрок в стену слева*/
		left:false,
		/**упирается ли игрок в стену справа*/
		right:false,
		/**упирается ли игрок в стену сверху*/
		higher:false
	});
	for(let y=_.get(d,[...collider,0,1]);y<_.get(d,[...collider,1,1]);y++){
		for(let x=_.get(d,[...collider,0,0]);x<_.get(d,[...collider,1,0]);x++){
			// Проверка снизу
			if(_.get(ground_collider,[y+1,x])){
				_.set(d,[...touch_wall,'below'],true);
			}
			// Проверка сверху
			if(_.get(ground_collider,[y-1,x])){
				_.set(d,[...touch_wall,'higher'],true);
			}
			// Проверка справа
			if(_.get(ground_collider,[y,x+1])){
				_.set(d,[...touch_wall,'right'],true);
			}
			// Проверка слева
			if(_.get(ground_collider,[y,x-1])){
				_.set(d,[...touch_wall,'left'],true);
			}
		}
	}
},
/**устанавливает рамку на активный слот хотбара*/
update_active_hotbar_slot_frame(){
	if(d.save.player.interface.hotbar.slot_count==0)return;
	let active_hotbar_slot_frame=document.getElementById('active_hotbar_slot_frame');
	if(!active_hotbar_slot_frame){
		active_hotbar_slot_frame=f.create_element_from_HTML(`<img id="active_hotbar_slot_frame" src="images/interface/inventory/active_slot_frame.webp"/>`);
	}
	document.querySelector(`.hotbar_slot[data-index="${d.save.player.interface.hotbar.active_slot_index}"]`).appendChild(active_hotbar_slot_frame);
},
/**генерирует хотбар*/
generate_hotbar(player=d.save.player,functional=true){
	let hotbar=f.create_element_from_HTML(`<div class="row"></div>`);
	if(functional){
		hotbar.id='hotbar';
	}
	for(let i=0;i<player.interface.hotbar.slot_count;i++){
		let slot=document.createElement('div');
		slot.dataset.index=i;
		slot.classList.add('hotbar_slot');
		if(functional){
			slot.addEventListener('click',function(e){
				player.interface.hotbar.active_slot_index=this.dataset.index;
				f.update_active_hotbar_slot_frame();
			});
		}
		hotbar.appendChild(slot);
	}
	return hotbar;
},
generate_esc_menu(){
	let esc_menu=f.create_element_from_HTML(`<div id="esc_menu"></div>`);
	let button_to_main_menu=f.create_button_from_text(d.language.interface.buttons.to_main_menu);
	button_to_main_menu.addEventListener('click',()=>{
		f.save_character(d.save.player);
		f.save_world(d.save.world);
		f.set_empty_player();
		f.change_room('main_menu');
	});
	button_to_main_menu.id='button_to_main_menu';
	d.button_to_main_menu=button_to_main_menu;
	esc_menu.appendChild(button_to_main_menu);
	return esc_menu;
},
/**генерирует интерфейс*/
update_interface(){
	if(!d.interface){
		console.warn('update_interface: interface is not ready yet');
		return;
	}
	d.interface.innerHTML='';
	d.interface.appendChild(f.generate_hotbar());
	f.update_active_hotbar_slot_frame();
	d.interface.appendChild(f.generate_esc_menu());
},
/**включает/отключает интерфейс*/
set_interface_visibility(is_visible){
	d.interface.style.visibility=(is_visible?'visible':'collapse');
},
/**активирует прошлый слот хотбара*/
activate_previous_hotbar_slot(){
	d.save.player.interface.hotbar.active_slot_index--;
	if(d.save.player.interface.hotbar.active_slot_index<0){
		d.save.player.interface.hotbar.active_slot_index=d.save.player.interface.hotbar.slot_count-1;
	}
	f.update_active_hotbar_slot_frame();
},
/**активирует следующий слот хотбара*/
activate_next_hotbar_slot(){
	d.save.player.interface.hotbar.active_slot_index++;
	if(d.save.player.interface.hotbar.active_slot_index>=d.save.player.interface.hotbar.slot_count){
		d.save.player.interface.hotbar.active_slot_index=0;
	}
	f.update_active_hotbar_slot_frame();
},
verify_permission(handle, withWrite) {
	const opts = {};
	if (withWrite) opts.mode = 'readwrite';
	// Возвращаем Promise<boolean>
	try {
		return Promise.resolve().then(()=>{
			if (!handle.queryPermission) return false;
			return handle.queryPermission(opts);
		}).then(result => {
			if (result === 'granted') return true;
			if (!handle.requestPermission) return false;
			return handle.requestPermission(opts).then(r => r === 'granted');
		}).catch(e => { console.warn('verify_permission error', e); return false; });
	} catch (e) {
		console.warn('verify_permission sync error', e);
		return Promise.resolve(false);
	}
},
// Добавляем прокси для localStorage
getStorage(key) {
  return window.SANDBOX_PROXY.getStorage(key);
},
setStorage(key, value) {
  return window.SANDBOX_PROXY.setStorage(key, value);
},
fetch_json(path){
	return fetch(path)
	.then(response=>{
		if(!response.ok){
			throw new Error('Ошибка сети');
		}
		return response.json();
	}).then(data=>{
		return data;// данные будут доступны через then
	}).catch(error=>{
		console.error('Ошибка загрузки файла:',error);
		throw error;// пробрасываем ошибку дальше
	});
},
/**загружает языки из папки languages*/
load_languages(){
	return f.list_files('languages').then(files=>{
		let languages_div=document.getElementById('languages_div');
		languages_div.innerHTML='';
		// Создаем массив промисов для каждого скрипта
		const promises=[];
		for(const file of files){
			const promise=new Promise((resolve,reject)=>{
				const script=document.createElement('script');
				script.src=`languages/${file}`;
				script.onload=resolve;
				script.onerror=reject;
				languages_div.appendChild(script);
			});
			promises.push(promise);
		}
		// Ждем загрузки всех скриптов
		return Promise.all(promises);
	});
},
character_to_element(character){
	let div1=f.create_element_from_HTML(`<div></div>`);
	div1.appendChild(f.create_element_from_HTML(f.get_transparent_space_text(character.nickname)));
	div1.appendChild(f.get_br());
	let hotbar=f.generate_hotbar(character,false);
	div1.appendChild(hotbar);
	let button=f.wrap_in_frame(div1);
	button.addEventListener('click',()=>{
		d.save.player=character;
		f.change_room(d.is_singleplayer?'world_selection':'server_selection');
	});
	return button;
},
create_characters_list(){
	let characters_list=f.create_element_from_HTML('<div id="characters_list" class="column"></div>');
	for(let character of d.characters){
		let character_element=f.character_to_element(character);
		characters_list.appendChild(character_element);
		characters_list.appendChild(f.get_br());
		characters_list.appendChild(f.get_br());
	}
	return characters_list;
},
save_character(character){
	f.write_file(`YOUR_DATA/characters/${character.nickname}.json`,f.object_to_string(character)).then(()=>{
		f.print_to_chat(d.language.notifications.character_saved);
	});
},
update_characters_list(){
	d.save.temp.room.data.characters_list_div.replaceChildren(f.create_characters_list());
},
save_character_update_list(character){
	f.save_character(character);
	d.characters.unshift(character);
	f.update_characters_list();
},
load_character:async function(filename) {
	return await f.fetch_json(`YOUR_DATA/characters/${filename}`);
},
load_characters:async function(){
	try{
		d.characters=[];
		const files=await f.list_files('YOUR_DATA/characters');
		// Загружаем всех персонажей параллельно
		const characterPromises=files.map(file=>
			this.load_character(file)
		);
		const characters=await Promise.all(characterPromises);
		// Добавляем всех персонажей в массив
		d.characters.unshift(...characters);
		return characters;
	}catch(error){
		console.error('Ошибка загрузки персонажей:', error);
		throw error;
	}
},
world_to_element(world){
	let div1=f.create_element_from_HTML(`<div></div>`);
	div1.appendChild(f.create_element_from_HTML(f.get_transparent_space_text(world.name)));
	let button=f.wrap_in_frame(div1);
	button.addEventListener('click',()=>{
		d.save.world=world;
		if(d.save.world.players&&d.save.world.players[d.save.player.nickname]&&d.save.world.players[d.save.player.nickname].position){
			f.load_save(d.save);
		}else{
			f.change_room('intro0');
		}
	});
	return button;
},
create_worlds_list(){
	let worlds_list=f.create_element_from_HTML('<div id="worlds_list" class="column"></div>');
	for(let world of d.worlds){
		let world_element=f.world_to_element(world);
		worlds_list.appendChild(world_element);
		worlds_list.appendChild(f.get_br());
		worlds_list.appendChild(f.get_br());
	}
	return worlds_list;
},
save_world(world){
	f.write_file(`YOUR_DATA/worlds/${world.name}.json`,f.object_to_string(world)).then(()=>{
		f.print_to_chat(d.language.notifications.world_saved);
	});
},
update_worlds_list(){
	d.save.temp.room.data.worlds_list_div.replaceChildren(f.create_worlds_list());
},
save_world_update_list(world){
	f.save_world(world);
	d.worlds.unshift(world);
	f.update_worlds_list();
},
load_world:async function(filename) {
	return await f.fetch_json(`YOUR_DATA/worlds/${filename}`);
},
load_worlds:async function(){
	try{
		d.worlds=[];
		const files=await f.list_files('YOUR_DATA/worlds');
		const worldPromises=files.map(file=>
			this.load_world(file)
		);
		const worlds=await Promise.all(worldPromises);
		d.worlds.unshift(...worlds);
		return worlds;
	}catch(error){
		console.error('Ошибка загрузки миров:',error);
		throw error;
	}
},
/**загружает сохранение*/
load_save(data){
	d.loadable_save_data=_.cloneDeep(data);
	f.change_room(d.save.world.players[d.save.player.nickname].position.room_id);
},
/**начать подготову комнаты*/
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
