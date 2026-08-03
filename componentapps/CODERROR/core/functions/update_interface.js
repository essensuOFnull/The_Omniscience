import generate_hotbar from './generate_hotbar';
import generate_esc_menu from './generate_esc_menu';
import update_active_hotbar_slot_frame from './update_active_hotbar_slot_frame';
export default function(){
	if(!window.CODERROR.__originals__.data.interface){
		console.warn('update_interface: interface is not ready yet');
		return;
	}
	window.CODERROR.__originals__.data.interface.innerHTML='';
	window.CODERROR.__originals__.data.interface.appendChild(generate_hotbar());
	update_active_hotbar_slot_frame();
	window.CODERROR.__originals__.data.interface.appendChild(generate_esc_menu());
}