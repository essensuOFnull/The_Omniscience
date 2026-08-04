import _ from 'lodash';
import update_three_scene from './functions/update_three_scene';
import change_button_color from './functions/change_button_color';
import check_hover from './functions/check_hover';
import apply_standard_buttons_style from './functions/apply_standard_buttons_style';
import render_symbols_grid from './functions/render_symbols_grid';
import get_random_true_str_color from './functions/get_random_true_str_color';
{
let f=window.CODERROR.__originals__.functions,
d=window.CODERROR.__originals__.data;

let frame_count=0;
setInterval(()=>{
	window.CODERROR.__originals__.data.FPS=frame_count;
	frame_count=0;
},1000);

window.CODERROR.__originals__.data.app.ticker.add(()=>{
	/*переменные для укорочения кода*/
	let nickname=window.CODERROR.__originals__.data.save.player.nickname,
	room_id=_.get(window.CODERROR.__originals__.data,['save','world','players',nickname,'position','room_id']);
	
	if(!window.has_focus&&window.CODERROR.__originals__.data.settings.interface.pause_on_blur)return
	frame_count++;
	/*обновление канваса three*/
	update_three_scene();
	/*кнопки интекрфейса игрока*/
	let button_to_main_menu=window.CODERROR.__originals__.data._cached_button_to_main_menu||(window.CODERROR.__originals__.data._cached_button_to_main_menu=document.getElementById('button_to_main_menu'));
	if(button_to_main_menu){
		change_button_color(button_to_main_menu,(check_hover(button_to_main_menu)?get_random_true_str_color():'#fff'));
	}
	/*вызовем логику отрисовки текущей комнаты*/
	eval(window.CODERROR.__originals__.data.current_room_render);
	/*действия, которые надо совершить вне зависимости от комнаты*/
	if(!window.CODERROR.__originals__.data.save.temp.room.preparation){
		/*применяем мерцание к кнопки выхода в главное меню если она есть*/
		let button_to_main_menu=_.get(window.CODERROR.__originals__.data,['button_to_main_menu']);
		if(button_to_main_menu){
			apply_standard_buttons_style({button_to_main_menu});
		}
	}
	render_symbols_grid();
	/*Применяем позицию кастомного курсора*/
	if(window.CODERROR.__originals__.data._cursorNeedsUpdate){
		window.CODERROR.__originals__.data.cursor.style.transform=`translate3d(${window.CODERROR.__originals__.data._cursorTargetX}px, ${window.CODERROR.__originals__.data._cursorTargetY}px, 0)`;
		window.CODERROR.__originals__.data._cursorNeedsUpdate=false;
	}
});
}