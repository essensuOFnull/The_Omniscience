import _ from 'lodash';
import update_interface from './functions/update_interface';
import change_title from './functions/change_title';
import activate_previous_hotbar_slot from './functions/activate_previous_hotbar_slot';
import activate_next_hotbar_slot from './functions/activate_next_hotbar_slot';
import prepare from './functions/prepare';
import get_br from './functions/get_br';
import init_audio from './functions/init_audio';
import get_midi_inputs from './functions/get_midi_inputs';
import get_midi_outputs from './functions/get_midi_outputs';
import set_interface_visibility from './functions/set_interface_visibility';
import create_element_from_HTML from './functions/create_element_from_HTML';
import create_button_from_text from './functions/create_button_from_text';
import get_symbolic_hr from './functions/get_symbolic_hr';
import print_to_chat from './functions/print_to_chat';
import init_file_access from './functions/init_file_access';
import init_symbols_grid from './functions/init_symbols_grid';
import load_languages from './functions/load_languages';
import read_file from './functions/read_file';
import get_transparent_space_text from './functions/get_transparent_space_text';
import apply_settings from './functions/apply_settings';
import update_activated_actions from './functions/update_activated_actions';
import change_room from './functions/change_room';
import change_button_text_color from './functions/change_button_text_color';
{
let f=window.CODERROR.__originals__.functions,
d=window.CODERROR.__originals__.data,
f_s=window.CODERROR.CHEATING.functions;

let MS_PER_UPDATE=1000/window.CODERROR.__originals__.data.fixed_TPS; // Шаг в миллисекундах
let previous_time=performance.now();
let lag=0;
let tps_count=0;
let last_measure=performance.now();
setInterval(()=>{
	let now=performance.now();
	window.CODERROR.__originals__.data.TPS=Math.round(tps_count*1000/(now-last_measure))||0;
	tps_count=0;
	last_measure=now;
},1000);
/*инициализация интерфейса*/
update_interface();
/**заблокировать ли инвентарь*/
window.CODERROR.__originals__.data.lock_inventory=false;
/*функция главного цикла*/
function update_game_logic(){
	/*переменные для укорочения кода*/
	let nickname=window.CODERROR.__originals__.data.save.player.nickname,
	room_id=_.get(window.CODERROR.__originals__.data,['save','world','players',nickname,'position','room_id']);

	change_title(`CODERROR (1)${window.CODERROR.__originals__.data.manifest.version} TPS: ${window.CODERROR.__originals__.data.TPS} FPS: ${window.CODERROR.__originals__.data.FPS} - ${window.CODERROR.__originals__.data.splash}`);
	if(!window.has_focus&&window.CODERROR.__originals__.data.settings.interface.pause_on_blur)return
	tps_count++;
	/*переключение слотов хотбара*/
	if(document.getElementById('hotbar')){
		if(window.CODERROR.__originals__.data.activated_actions.has('previous_hotbar_slot')){
			activate_previous_hotbar_slot();
		}
		if(window.CODERROR.__originals__.data.activated_actions.has('next_hotbar_slot')){
			activate_next_hotbar_slot();
		}
	}
	/*открытие/закрытие инвентаря*/
	let open_inventory=false,close_inventory=false;
	if(window.CODERROR.__originals__.data.activated_actions.has('open_inventory')){
		open_inventory=true;
	}
	if(window.CODERROR.__originals__.data.activated_actions.has('close_inventory')){
		close_inventory=true;
	}
	if(open_inventory||close_inventory){
		if(!window.CODERROR.__originals__.data.lock_inventory){
			/**меню, возникающее при escape (по умолчанию)*/
			window.CODERROR.__originals__.data.esc_menu=document.getElementById('esc_menu');
			if(open_inventory&&close_inventory){
				if(window.CODERROR.__originals__.data.esc_menu.style.visibility=='inherit'){
					window.CODERROR.__originals__.data.esc_menu.style.visibility='collapse';
				}else{
					window.CODERROR.__originals__.data.esc_menu.style.visibility='inherit';
				}
			}else if(open_inventory){
				window.CODERROR.__originals__.data.esc_menu.style.visibility='inherit';
			}else{
				window.CODERROR.__originals__.data.esc_menu.style.visibility='collapse';
			}
		}
		window.CODERROR.__originals__.data.lock_inventory=true;
	}else{
		window.CODERROR.__originals__.data.lock_inventory=false;
	}
	/*начальная комната, которую надо загрузить отдельно*/
	if(room_id=='disclaimer'){
		prepare(()=>{
			init_audio();
			get_midi_inputs();
			get_midi_outputs();
			set_interface_visibility(false);
			window.CODERROR.__originals__.data.save.temp.room.data={
				scrollable:create_element_from_HTML(`<div class='scrollable'/>`),
				div:create_element_from_HTML(`<div class="center column fill-parent"/>`),
				button_continue:create_button_from_text(`принять риск и продолжить\n\ntake the risk and continue`),
			}
			window.CODERROR.__originals__.data.save.temp.room.data.scrollable.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.div);
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(create_element_from_HTML(`<div>${get_transparent_space_text(`ДИСКЛЕЙМЕР | DISCLAIMER`,'#FF1D34')}</div>`));
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(get_br());
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(get_symbolic_hr());
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(get_br());
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(create_element_from_HTML(`<div style='text-align:center'>${get_transparent_space_text(`Игра содержит часто сменяющиеся мелькающие цвета, что может вызвать приступ эпилепсии.\n\nАвтор не чурается использовать информацию из любых источников, такую как аудио и текстуры, даже если они возможно обладают авторскими правами, и просит простить его за это)`,'#FF1D34')}</div>`));
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(get_br());
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(get_symbolic_hr());
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(get_br());
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(create_element_from_HTML(`<div style='text-align:center'>${get_transparent_space_text(`The game contains frequently changing flashing colors, which may cause an epileptic seizure.\n\nThe author does not shy away from using information from any source, such as audio and textures, even if they may have copyrights, and asks for forgiveness for this)`,'#FF1D34')}</div>`));
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(get_br());
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(get_symbolic_hr());
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(get_br());
			window.CODERROR.__originals__.data.save.temp.room.data.div.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.button_continue);
			window.CODERROR.__originals__.data.save.temp.room.data.button_continue.addEventListener('click',()=>{
				let loading=document.getElementById('loading');
				loading.style.display='block';
				/*получение доступа к своей же папке*/
				init_file_access().then(()=>{
					init_symbols_grid().then(()=>{
						try{
							/*используя полученные возможности, продолжаем загрузку игры*/
							/*загружаем языки*/
							load_languages().then(()=>{
								/*загружаем и применяем настройки*/
								read_file('YOUR_DATA/settings.json').then((text)=>{
									if(text){
										window.CODERROR.__originals__.data.settings=JSON.parse(text);
										apply_settings();
										print_to_chat(window.CODERROR.__originals__.data.language.notifications.settings_loaded);
									}
								});
							});
						}catch(e){
							print_to_chat(window.CODERROR.__originals__.data.language.errors.common(e));
						}
						loading.style.display='none';
						change_room('main_menu');
					});
				}).catch(e=>{ console.warn('init_file_access failed:', e); });
			});
			change_button_text_color(window.CODERROR.__originals__.data.save.temp.room.data.button_continue,'#FF1D34');
			window.CODERROR.__originals__.data.overlay.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.scrollable);
		});
	}
	/*вызовем логику физики текущей комнаты*/
	eval(window.CODERROR.__originals__.data.current_room_physics);
	/*разрешенные игроку функции*/
	window.CODERROR.PERMITTEwindow.CODERROR.__originals__.data.functions={
		apply_language:f_s.apply_language,
		set_max_content_size:f_s.set_max_content_size,
		apply_random_splash:f_s.apply_random_splash,
		apply_settings:f_s.apply_settings
	};
	/*деактивируем прокрутку колесика мыши*/
	window.CODERROR.__originals__.data.pressewindow.CODERROR.__originals__.data.delete(`WheelUp`);
	window.CODERROR.__originals__.data.pressewindow.CODERROR.__originals__.data.delete(`WheelDown`);
	update_activated_actions();
}

let fixed_update=()=>{
	let currentTime=performance.now();
	let elapsed=currentTime-previous_time;
	previous_time=currentTime;
	lag+=elapsed;
	// Выполняем логику столько раз, сколько "накопилось" шагов
	while(lag>=MS_PER_UPDATE){
		update_game_logic();
		lag-=MS_PER_UPDATE;
	}
	requestAnimationFrame(fixed_update);
};
// Запускаем цикл
fixed_update();
}