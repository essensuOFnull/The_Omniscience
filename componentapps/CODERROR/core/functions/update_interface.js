import generate_hotbar from './generate_hotbar';
import generate_esc_menu from './generate_esc_menu';
import update_active_hotbar_slot_frame from './update_active_hotbar_slot_frame';
export default function(){
	if(!d.interface){
		console.warn('update_interface: interface is not ready yet');
		return;
	}
	d.interface.innerHTML='';
	d.interface.appendChild(generate_hotbar());
	update_active_hotbar_slot_frame();
	d.interface.appendChild(generate_esc_menu());
}