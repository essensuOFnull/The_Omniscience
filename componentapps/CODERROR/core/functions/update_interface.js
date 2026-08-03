export default function(){
	if(!d.interface){
		console.warn('update_interface: interface is not ready yet');
		return;
	}
	d.interface.innerHTML='';
	d.interface.appendChild(f.generate_hotbar());
	f.update_active_hotbar_slot_frame();
	d.interface.appendChild(f.generate_esc_menu());
}