import init_audio from './init_audio';
import handle_play_error from './handle_play_error';
export default function(){
	if(d.audio_initialized)return;
	d.audio_initialized=true;
	document.removeEventListener('click',init_audio);
	if(!d.current_music)return
	d.current_music.play().catch(handle_play_error);
}