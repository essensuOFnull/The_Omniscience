export default function(){
	let characters_list=f.create_element_from_HTML('<div id="characters_list" class="column"></div>');
	for(let character of d.characters){
		let character_element=f.character_to_element(character);
		characters_list.appendChild(character_element);
		characters_list.appendChild(f.get_br());
		characters_list.appendChild(f.get_br());
	}
	return characters_list;
}