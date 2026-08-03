import create_element_from_HTML from './create_element_from_HTML';
export default function(){
	if(d.save.player.interface.hotbar.slot_count==0)return;
	let active_hotbar_slot_frame=document.getElementById('active_hotbar_slot_frame');
	if(!active_hotbar_slot_frame){
		active_hotbar_slot_frame=create_element_from_HTML(`<img id="active_hotbar_slot_frame" src="images/interface/inventory/active_slot_frame.webp"/>`);
	}
	document.querySelector(`.hotbar_slot[data-index="${d.save.player.interface.hotbar.active_slot_index}"]`).appendChild(active_hotbar_slot_frame);
}