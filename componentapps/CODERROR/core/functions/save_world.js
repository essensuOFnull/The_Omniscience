import write_file from './write_file';
import object_to_string from './object_to_string';
import print_to_chat from './print_to_chat';
export default function(world){
	write_file(`YOUR_DATA/worlds/${worlwindow.CODERROR.__originals__.data.name}.json`,object_to_string(world)).then(()=>{
		print_to_chat(window.CODERROR.__originals__.data.language.notifications.world_saved);
	});
}