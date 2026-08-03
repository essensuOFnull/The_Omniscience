export default function(character){
	f.save_character(character);
	d.characters.unshift(character);
	f.update_characters_list();
}