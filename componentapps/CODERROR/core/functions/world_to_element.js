import create_element_from_HTML from './create_element_from_HTML';
import get_transparent_space_text from './get_transparent_space_text';
import wrap_in_frame from './wrap_in_frame';
import load_save from './load_save';
import change_room from './change_room';
export default function(world){
	let div1=create_element_from_HTML(`<div></div>`);
	div1.appendChild(create_element_from_HTML(get_transparent_space_text(world.name)));
	let button=wrap_in_frame(div1);
	button.addEventListener('click',()=>{
		d.save.world=world;
		if(d.save.world.players&&d.save.world.players[d.save.player.nickname]&&d.save.world.players[d.save.player.nickname].position){
			load_save(d.save);
		}else{
			change_room('intro0');
		}
	});
	return button;
}