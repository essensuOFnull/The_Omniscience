import save_world from './save_world'; 
import update_worlds_list from './update_worlds_list';
export default function(world){
	save_world(world);
	d.worlds.unshift(world);
	update_worlds_list();
}