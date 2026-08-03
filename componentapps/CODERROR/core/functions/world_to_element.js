export default function(world){
	let div1=f.create_element_from_HTML(`<div></div>`);
	div1.appendChild(f.create_element_from_HTML(f.get_transparent_space_text(world.name)));
	let button=f.wrap_in_frame(div1);
	button.addEventListener('click',()=>{
		d.save.world=world;
		if(d.save.world.players&&d.save.world.players[d.save.player.nickname]&&d.save.world.players[d.save.player.nickname].position){
			f.load_save(d.save);
		}else{
			f.change_room('intro0');
		}
	});
	return button;
}