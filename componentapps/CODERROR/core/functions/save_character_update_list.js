import save_character from './save_character';
import update_characters_list from './update_characters_list';
export default function(character){
	save_character(character);
	window.CODERROR.__originals__.data.characters.unshift(character);
	update_characters_list();
}