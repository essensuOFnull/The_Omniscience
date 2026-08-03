f.prepare(()=>{
	f.set_sky('images/skies/glitch_anime_girls','webp',false);
	f.set_music('midi/TouHou_ the Embodiment of Scarlet Devil - U.N.  Owen was her_.mid');
	f.set_interface_visibility(false);
	window.CODERROR.__originals__.data.save.temp.room.data={
		scrollable:f.create_element_from_HTML(`<div class="scrollable"/>`),
		div1:f.create_element_from_HTML(`<div class="center column"/>`),
		contribution:structuredClone(Object.entries(window.CODERROR.__originals__.data.language.contribution)),
		div2:f.create_element_from_HTML(`<div class="center column"/>`),
		buttons:{
			back:f.create_button_from_text(`назад`)
		},
		y_sky_rotation:0,
	};
	window.CODERROR.__originals__.data.overlay.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.scrollable);
	window.CODERROR.__originals__.data.save.temp.room.data.scrollable.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.div1);
	window.CODERROR.__originals__.data.save.temp.room.data.contribution.forEach(([name,contribution],i)=>{
		window.CODERROR.__originals__.data.save.temp.room.data.contribution[i]=f.create_element_from_HTML(`<div>${f.get_transparent_space_text(`${name}⦑reset⦒ - ${contribution}`)}</div>`);
		window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(f.get_br());
		window.CODERROR.__originals__.data.save.temp.room.data.div1.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.contribution[i]);
	});
	window.CODERROR.__originals__.data.overlay.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.div2);
	window.CODERROR.__originals__.data.save.temp.room.data.div2.appendChild(window.CODERROR.__originals__.data.save.temp.room.data.buttons.back);
	window.CODERROR.__originals__.data.save.temp.room.data.buttons.back.addEventListener('click',()=>{
		f.change_room('main_menu');
	});
});
f.set_sky_rotation((window.CODERROR.__originals__.data.mouse.y-wrapper.clientHeight/2)/1000,window.CODERROR.__originals__.data.save.temp.room.data.y_sky_rotation+(window.CODERROR.__originals__.data.mouse.x-wrapper.clientWidth/2)/1000,0);
if(window.CODERROR.__originals__.data.save.temp.room.data.y_sky_rotation==Math.PI){
	window.CODERROR.__originals__.data.save.temp.room.data.y_sky_rotation=0;
}
window.CODERROR.__originals__.data.save.temp.room.data.y_sky_rotation+=0.005;