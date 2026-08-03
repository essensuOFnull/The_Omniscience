import save_world from './save_world'; 
import update_worlds_list from './update_worlds_list';
export default function(world){
	save_world(world);
	window.CODERROR.__originals__.data.worlds.unshift(world);
	update_worlds_list();
}