import write_file from './write_file';
import print_to_chat from './print_to_chat';
import object_to_string from './object_to_string';
export default function(character){
	write_file(`YOUR_DATA/characters/${character.nickname}.json`,object_to_string(character)).then(()=>{
		print_to_chat(window.CODERROR.__originals__.data.language.notifications.character_saved);
	});
}