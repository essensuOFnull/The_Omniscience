import create_element_from_HTML from './create_element_from_HTML';
import get_transparent_space_text from './get_transparent_space_text';
import wrap_in_frame from './wrap_in_frame';
import load_save from './load_save';
import change_room from './change_room';
export default function(world){
	let div1=create_element_from_HTML(`<div></div>`);
	div1.appendChild(create_element_from_HTML(get_transparent_space_text(worlwindow.CODERROR.__originals__.data.name)));
	let button=wrap_in_frame(div1);
	button.addEventListener('click',()=>{
		window.CODERROR.__originals__.data.save.world=world;
		if(window.CODERROR.__originals__.data.save.worlwindow.CODERROR.__originals__.data.players&&window.CODERROR.__originals__.data.save.worlwindow.CODERROR.__originals__.data.players[window.CODERROR.__originals__.data.save.player.nickname]&&window.CODERROR.__originals__.data.save.worlwindow.CODERROR.__originals__.data.players[window.CODERROR.__originals__.data.save.player.nickname].position){
			load_save(window.CODERROR.__originals__.data.save);
		}else{
			change_room('intro0');
		}
	});
	return button;
}