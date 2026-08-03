export default function(){
	window.CODERROR.__originals__.data.activated_actions.clear();
	Object.entries(window.CODERROR.__originals__.data.settings.control).forEach(([control_id,control])=>{
		if(control_id!='bind_to_layout'){
			for(let key of control){
				if(window.CODERROR.__originals__.data.pressewindow.CODERROR.__originals__.data.has(key)){
					window.CODERROR.__originals__.data.activated_actions.add(control_id);
					break;
				}
			}
		}
	});
}