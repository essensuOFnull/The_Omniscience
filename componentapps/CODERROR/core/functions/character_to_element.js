import create_element_from_HTML from './create_element_from_HTML';
import get_transparent_space_text from './get_transparent_space_text';
import get_br from './get_br';
import generate_hotbar from './generate_hotbar';
import wrap_in_frame from './wrap_in_frame';
import change_room from './change_room';
export default function(character){
	let div1=create_element_from_HTML(`<div></div>`);
	div1.appendChild(create_element_from_HTML(get_transparent_space_text(character.nickname)));
	div1.appendChild(get_br());
	let hotbar=generate_hotbar(character,false);
	div1.appendChild(hotbar);
	let button=wrap_in_frame(div1);
	button.addEventListener('click',()=>{
		window.CODERROR.__originals__.data.save.player=character;
		change_room(window.CODERROR.__originals__.data.is_singleplayer?'world_selection':'server_selection');
	});
	return button;
}