export default function(character){
	let div1=f.create_element_from_HTML(`<div></div>`);
	div1.appendChild(f.create_element_from_HTML(f.get_transparent_space_text(character.nickname)));
	div1.appendChild(f.get_br());
	let hotbar=f.generate_hotbar(character,false);
	div1.appendChild(hotbar);
	let button=f.wrap_in_frame(div1);
	button.addEventListener('click',()=>{
		d.save.player=character;
		f.change_room(d.is_singleplayer?'world_selection':'server_selection');
	});
	return button;
}