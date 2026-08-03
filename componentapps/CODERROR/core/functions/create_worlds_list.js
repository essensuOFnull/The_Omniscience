import create_element_from_HTML from './create_element_from_HTML';
import world_to_element from './world_to_element';
import get_br from './get_br';
export default function(){
	let worlds_list=create_element_from_HTML('<div id="worlds_list" class="column"></div>');
	for(let world of d.worlds){
		let world_element=world_to_element(world);
		worlds_list.appendChild(world_element);
		worlds_list.appendChild(get_br());
		worlds_list.appendChild(get_br());
	}
	return worlds_list;
}