import create_element_from_HTML from './create_element_from_HTML';
import update_active_hotbar_slot_frame from './update_active_hotbar_slot_frame';
export default function(player=d.save.player,functional=true){
	let hotbar=create_element_from_HTML(`<div class="row"></div>`);
	if(functional){
		hotbar.id='hotbar';
	}
	for(let i=0;i<player.interface.hotbar.slot_count;i++){
		let slot=document.createElement('div');
		slot.dataset.index=i;
		slot.classList.add('hotbar_slot');
		if(functional){
			slot.addEventListener('click',function(e){
				player.interface.hotbar.active_slot_index=this.dataset.index;
				update_active_hotbar_slot_frame();
			});
		}
		hotbar.appendChild(slot);
	}
	return hotbar;
}