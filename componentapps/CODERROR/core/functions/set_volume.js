export default function(volume){
	window.CODERROR.__originals__.data.music_volume=Math.max(0,Math.min(1,volume));
	if(window.CODERROR.__originals__.data.current_music)window.CODERROR.__originals__.data.current_music.volume=window.CODERROR.__originals__.data.music_volume;
}