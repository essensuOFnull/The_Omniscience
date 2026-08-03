export default function(world){
	f.save_world(world);
	d.worlds.unshift(world);
	f.update_worlds_list();
}