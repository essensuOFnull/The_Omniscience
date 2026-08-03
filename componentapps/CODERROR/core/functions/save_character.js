export default function(character){
	f.write_file(`YOUR_DATA/characters/${character.nickname}.json`,f.object_to_string(character)).then(()=>{
		f.print_to_chat(d.language.notifications.character_saved);
	});
}