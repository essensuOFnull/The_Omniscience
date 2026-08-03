export default function(){
	if(d.audio_initialized)return;
	d.audio_initialized=true;
	document.removeEventListener('click',f.init_audio);
	if(!d.current_music)return
	d.current_music.play().catch(f.handle_play_error);
}