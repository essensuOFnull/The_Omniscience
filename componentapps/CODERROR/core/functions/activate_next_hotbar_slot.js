export default function(){
	d.save.player.interface.hotbar.active_slot_index++;
	if(d.save.player.interface.hotbar.active_slot_index>=d.save.player.interface.hotbar.slot_count){
		d.save.player.interface.hotbar.active_slot_index=0;
	}
	f.update_active_hotbar_slot_frame();
}