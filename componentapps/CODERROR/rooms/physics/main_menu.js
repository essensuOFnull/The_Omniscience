f.prepare(()=>{
	f.set_sky('images/skies/glitch','webp');
	f.set_music('music/main_menu.webm');
	f.set_interface_visibility(false);
	window.CODERROR.__originals__.data.save.temp.room.data={
		info:f.create_element_from_HTML(`<div>${f.get_transparent_space_text(`CODERROR (1)${window.CODERROR.__originals__.data.manifest.version} by essensuOFnull`,'#c8c8c8')}</div>`),
		logo:f.create_element_from_HTML(`<div class="center-horizontal">${f.get_transparent_space_text(String.raw`
/T\ /T\ PT\ P] PT\ PT\ /T\ PT\
L U L q L q H  L q L q L q L q
L   L q L q H] L_/ L_/ L q L_/
L n L q L q H  U n U n L q U n
\_/ \_/ L_/ L] U U U U \_/ U U`.trim())}</div>`),
		scrollable:f.create_element_from_HTML(`<div class="scrollable"/>`),
		buttons_div:f.create_element_from_HTML(`<div class="center column fill-parent"/>`),
		buttons:f.dict_to_buttons(window.CODERROR.__originals__.data.language.rooms[room_id].buttons),
		bug_counter:0
	};
	window.CODERROR.__originals__.data.overlay.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.info);
	window.CODERROR.__originals__.data.overlay.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.logo);
	Object.entries(window.CODERROR.__originals__.data.save.temp.room.data.buttons).forEach(([name,el])=>{
		window.CODERROR.__originals__.data.save.temp.room.data.buttons_div.appendChild(el);
		window.CODERROR.__originals__.data.save.temp.room.data.buttons_div.appendChild(f.get_br());
	});
	window.CODERROR.__originals__.data.save.temp.room.data.scrollable.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.buttons_div);
	window.CODERROR.__originals__.data.overlay.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.scrollable);
	window.CODERROR.__originals__.data.save.temp.room.data.buttons.singleplayer.addEventListener('click',()=>{
		window.CODERROR.__originals__.data.is_singleplayer=true;
		f.change_room('character_selection');
	});
	window.CODERROR.__originals__.data.save.temp.room.data.buttons.multiplayer.addEventListener('click',()=>{
		window.CODERROR.__originals__.data.is_singleplayer=false;
		f.change_room('character_selection');
	});
	window.CODERROR.__originals__.data.save.temp.room.data.buttons.settings.addEventListener('click',()=>{
		f.change_room('settings');
	});
	window.CODERROR.__originals__.data.save.temp.room.data.buttons.authors.addEventListener('click',()=>{
		f.change_room('authors');
	});
	window.CODERROR.__originals__.data.save.temp.room.data.buttons.room_editor.addEventListener('click',()=>{
		f.change_room('room_editor_selection');
	});
	if(window.CODERROR.__originals__.data.need_directory_permission){
		let select_folder_button = f.create_button('ВЫБРАТЬ ПАПКУ');
		window.CODERROR.__originals__.data.save.temp.room.data.buttons_div.appendChild(select_folder_button);
		window.CODERROR.__originals__.data.save.temp.room.data.buttons_div.appendChild(f.get_br());
		select_folder_button.addEventListener('click',()=>{
			window.message_sender.send_message('REQUEST_DIRECTORY',{});
		});
	}
	f.change_button_border_color(window.CODERROR.__originals__.data.save.temp.room.data.buttons.donation,'#ffd700');
	// Сделать кнопку пожертвования "эпичной": добавить класс для пульсации
	if(window.CODERROR.__originals__.data.save.temp.room.data.buttons.donation && !window.CODERROR.__originals__.data.save.temp.room.data.buttons.donation.classList.contains('epic-donation-button')){
		window.CODERROR.__originals__.data.save.temp.room.data.buttons.donation.classList.add('epic-donation-button');
	}
	window.CODERROR.__originals__.data.save.temp.room.data.buttons.donation.addEventListener('click',()=>{
		window.open('https://tbank.ru/cf/4yH9fggd9e9','_blank');
	});
	f.change_button_color(window.CODERROR.__originals__.data.save.temp.room.data.buttons.exit,'#f00');
	window.CODERROR.__originals__.data.save.temp.room.data.buttons.exit.addEventListener('click',()=>{
		alert("⚠️ ERROR 400: Bad Request");
		self.close();
	});
});
f.rotate_sky(0.005,0.01,0);