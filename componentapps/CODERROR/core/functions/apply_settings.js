import apply_language from './apply_language';
import set_volume from './set_volume';
import apply_random_splash from './apply_random_splash';
import set_max_content_size from './set_max_content_size';
import change_room from './change_room';
export default function(){
	apply_language(window.CODERROR.__originals__.data.settings.interface.language);
	set_volume(window.CODERROR.__originals__.data.settings.audio.music_volume);
	apply_random_splash();
	/*set_font_size(window.CODERROR.__originals__.data.settings.interface.font_size);*/
	set_max_content_size(window.CODERROR.__originals__.data.settings.interface.max_content_width,window.CODERROR.__originals__.data.settings.interface.max_content_height);
	change_room(window.CODERROR.__originals__.data.save.world.players[window.CODERROR.__originals__.data.save.player.nickname].position.room_id);
}