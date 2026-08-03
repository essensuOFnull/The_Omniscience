export default function(){
	d.activated_actions.clear();
	Object.entries(d.settings.control).forEach(([control_id,control])=>{
		if(control_id!='bind_to_layout'){
			for(let key of control){
				if(d.pressed.has(key)){
					d.activated_actions.add(control_id);
					break;
				}
			}
		}
	});
}