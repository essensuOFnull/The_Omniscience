import update_active_hotbar_slot_frame from './update_active_hotbar_slot_frame';
export default function(){
	window.CODERROR.__originals__.data.save.player.interface.hotbar.active_slot_index++;
	if(window.CODERROR.__originals__.data.save.player.interface.hotbar.active_slot_index>=window.CODERROR.__originals__.data.save.player.interface.hotbar.slot_count){
		window.CODERROR.__originals__.data.save.player.interface.hotbar.active_slot_index=0;
	}
	update_active_hotbar_slot_frame();
}