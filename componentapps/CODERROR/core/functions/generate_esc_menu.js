export default function(){
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
}