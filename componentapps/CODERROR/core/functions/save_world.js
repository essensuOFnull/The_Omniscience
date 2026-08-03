import write_file from './write_file';
import object_to_string from './object_to_string';
import print_to_chat from './print_to_chat';
export default function(world){
	write_file(`YOUR_DATA/worlds/${world.name}.json`,object_to_string(world)).then(()=>{
		print_to_chat(d.language.notifications.world_saved);
	});
}