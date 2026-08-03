import create_element_from_HTML from './create_element_from_HTML';
import create_button_from_text from './create_button_from_text';
import save_character from './save_character';
import save_world from './save_world';
import set_empty_player from './set_empty_player';
import change_room from './change_room';
export default function(){
	let esc_menu=create_element_from_HTML(`<div id="esc_menu"></div>`);
	let button_to_main_menu=create_button_from_text(window.CODERROR.__originals__.data.language.interface.buttons.to_main_menu);
	button_to_main_menu.addEventListener('click',()=>{
		save_character(window.CODERROR.__originals__.data.save.player);
		save_world(window.CODERROR.__originals__.data.save.world);
		set_empty_player();
		change_room('main_menu');
	});
	button_to_main_menu.id='button_to_main_menu';
	window.CODERROR.__originals__.data.button_to_main_menu=button_to_main_menu;
	esc_menu.appendChild(button_to_main_menu);
	return esc_menu;
}