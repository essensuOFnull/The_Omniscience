export default function(world){
	f.write_file(`YOUR_DATA/worlds/${world.name}.json`,f.object_to_string(world)).then(()=>{
		f.print_to_chat(d.language.notifications.world_saved);
	});
}