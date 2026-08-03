import create_element_from_HTML from './create_element_from_HTML';
import character_to_element from './character_to_element';
import get_br from './get_br';
export default function(){
	let characters_list=create_element_from_HTML('<div id="characters_list" class="column"></div>');
	for(let character of window.CODERROR.__originals__.data.characters){
		let character_element=character_to_element(character);
		characters_list.appendChild(character_element);
		characters_list.appendChild(get_br());
		characters_list.appendChild(get_br());
	}
	return characters_list;
}