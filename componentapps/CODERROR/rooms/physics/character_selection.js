f.prepare(()=>{
	f.set_sky('images/skies/glitch','webp');
	f.set_music('music/main_menu.webm');
	f.set_interface_visibility(false);
	window.CODERROR.__originals__.data.save.temp.room.data={
		scrollable:f.create_element_from_HTML(`<div class='scrollable'/>`),
		div1:f.create_element_from_HTML(`<div class="center-horizontal-items"/>`),
		title:f.create_element_from_HTML(f.get_transparent_space_text(window.CODERROR.__originals__.data.language.rooms[room_id].title)),
		drop_zone:f.wrap_in_frame(f.create_element_from_HTML(`<div class='drop_zone center'><div style='text-align:center;'>${f.get_transparent_space_text(window.CODERROR.__originals__.data.language.rooms[room_id].drop_zone)}</div></div>`)),
		div2:f.create_element_from_HTML(`<div class="center wrap"/>`),
		buttons:f.dict_to_buttons(window.CODERROR.__originals__.data.language.rooms[room_id].buttons),
		characters_list_div:f.create_element_from_HTML(`<div style='display:contents'></div>`),
	};
	window.CODERROR.__originals__.data.overlay.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.scrollable);
	window.CODERROR.__originals__.data.save.temp.room.data.scrollable.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.div1);
	window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.drop_zone);
	window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(f.get_br());
	window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(f.get_br());
	window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.buttons.create);
	window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(f.get_br());
	window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(f.get_br());
	window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(f.get_symbolic_hr());
	window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.title);
	window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(f.get_symbolic_hr());
	window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(f.get_br());
	window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.characters_list_div);
	window.CODERROR.__originals__.data.overlay.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.div2);
	window.CODERROR.__originals__.data.save.temp.room.data.div2.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.buttons.back);

	f.load_characters().then(()=>{
		f.update_characters_list();
	});

	f.add_event_listener('get_json',window.CODERROR.__originals__.data.save.temp.room.data.drop_zone,(character)=>{
		f.save_character_update_list(character);
	});
	window.CODERROR.__originals__.data.save.temp.room.data.buttons.create.addEventListener('click',()=>{
		let nickname=prompt(window.CODERROR.__originals__.data.language.prompts.enter_nickname);
		if(nickname===null){
			return;
		}
		let character={
			nickname:nickname,
			is_symbolic:true,
			interface:{
				hotbar:{
					active_slot_index:0,
					slot_count:10,
				},
			},
			walk_delay:0,
			max_walk_delay:2
		};
		f.save_character_update_list(character);
	});
	window.CODERROR.__originals__.data.save.temp.room.data.buttons.back.addEventListener('click',()=>{
		f.change_room('main_menu');
	});
});
f.rotate_sky(0.005,0.01,0);