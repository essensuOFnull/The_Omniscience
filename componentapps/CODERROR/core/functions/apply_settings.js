export default function(){
	f.apply_language(d.settings.interface.language);
	f.set_volume(d.settings.audio.music_volume);
	f.apply_random_splash();
	/*set_font_size(d.settings.interface.font_size);*/
	f.set_max_content_size(d.settings.interface.max_content_width,d.settings.interface.max_content_height);
	f.change_room(d.save.world.players[d.save.player.nickname].position.room_id);
}