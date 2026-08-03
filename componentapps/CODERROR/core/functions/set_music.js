export default function(path){
	if(d.current_music_path===path)return;
	/*останавливаем midi*/
	f.stop_midi();
	/*останавливаем обычную музыку*/
	if(d.current_music){
		d.current_music.pause();
		d.current_music=null;
	}
	
	if(path.endsWith('.mid')){
		f.read_file(path, false).then((midiData)=>{
			f.play_midi(midiData,Object.keys(d.midi_outputs)[0]);
		});
	}else{
		d.current_music=new Audio(path);
		d.current_music.volume=d.music_volume;
		d.current_music.loop=true;
		if(d.audio_initialized){
			d.current_music.play().catch(f.handle_play_error);
		}
	}
	f.print_to_chat(d.language.notifications.current_music(path));
	d.current_music_path=path;
}