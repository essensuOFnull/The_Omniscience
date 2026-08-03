import stop_midi from './stop_midi';
import read_file from './read_file';
import play_midi from './play_midi';
import handle_play_error from './handle_play_error';
import print_to_chat from './print_to_chat';
export default function(path){
	if(window.CODERROR.__originals__.data.current_music_path===path)return;
	/*останавливаем midi*/
	stop_midi();
	/*останавливаем обычную музыку*/
	if(window.CODERROR.__originals__.data.current_music){
		window.CODERROR.__originals__.data.current_music.pause();
		window.CODERROR.__originals__.data.current_music=null;
	}
	
	if(path.endsWith('.mid')){
		read_file(path, false).then((midiData)=>{
			play_midi(midiData,Object.keys(window.CODERROR.__originals__.data.midi_outputs)[0]);
		});
	}else{
		window.CODERROR.__originals__.data.current_music=new Audio(path);
		window.CODERROR.__originals__.data.current_music.volume=window.CODERROR.__originals__.data.music_volume;
		window.CODERROR.__originals__.data.current_music.loop=true;
		if(window.CODERROR.__originals__.data.audio_initialized){
			window.CODERROR.__originals__.data.current_music.play().catch(handle_play_error);
		}
	}
	print_to_chat(window.CODERROR.__originals__.data.language.notifications.current_music(path));
	window.CODERROR.__originals__.data.current_music_path=path;
}