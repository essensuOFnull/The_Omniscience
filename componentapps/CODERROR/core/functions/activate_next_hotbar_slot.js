import update_active_hotbar_slot_frame from './update_active_hotbar_slot_frame';
export default function(){
	d.save.player.interface.hotbar.active_slot_index++;
	if(d.save.player.interface.hotbar.active_slot_index>=d.save.player.interface.hotbar.slot_count){
		d.save.player.interface.hotbar.active_slot_index=0;
	}
	update_active_hotbar_slot_frame();
}