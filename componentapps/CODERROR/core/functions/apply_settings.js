import apply_language from './apply_language';
import set_volume from './set_volume';
import apply_random_splash from './apply_random_splash';
import set_max_content_size from './set_max_content_size';
import change_room from './change_room';
export default function(){
	apply_language(d.settings.interface.language);
	set_volume(d.settings.audio.music_volume);
	apply_random_splash();
	/*set_font_size(d.settings.interface.font_size);*/
	set_max_content_size(d.settings.interface.max_content_width,d.settings.interface.max_content_height);
	change_room(d.save.world.players[d.save.player.nickname].position.room_id);
}