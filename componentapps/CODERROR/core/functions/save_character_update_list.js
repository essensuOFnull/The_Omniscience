import save_character from './save_character';
import update_characters_list from './update_characters_list';
export default function(character){
	save_character(character);
	d.characters.unshift(character);
	update_characters_list();
}