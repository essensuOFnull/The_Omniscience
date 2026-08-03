export default function(volume){
	d.music_volume=Math.max(0,Math.min(1,volume));
	if(d.current_music)d.current_music.volume=d.music_volume;
}