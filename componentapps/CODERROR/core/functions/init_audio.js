import init_audio from './init_audio';
import handle_play_error from './handle_play_error';
export default function(){
	if(window.CODERROR.__originals__.data.audio_initialized)return;
	window.CODERROR.__originals__.data.audio_initialized=true;
	document.removeEventListener('click',init_audio);
	if(!window.CODERROR.__originals__.data.current_music)return
	window.CODERROR.__originals__.data.current_music.play().catch(handle_play_error);
}