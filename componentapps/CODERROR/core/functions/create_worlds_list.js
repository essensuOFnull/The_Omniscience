export default function(){
	let worlds_list=f.create_element_from_HTML('<div id="worlds_list" class="column"></div>');
	for(let world of d.worlds){
		let world_element=f.world_to_element(world);
		worlds_list.appendChild(world_element);
		worlds_list.appendChild(f.get_br());
		worlds_list.appendChild(f.get_br());
	}
	return worlds_list;
}