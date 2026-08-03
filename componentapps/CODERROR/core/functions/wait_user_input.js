export default function(){
	return new Promise((resolve)=>{
		let handler=(e)=>{
			if(d.ignored_keys.includes(e.code))return
			e.preventDefault();
			document.removeEventListener('keydown',handler);
			document.removeEventListener('mousedown',handler);
			document.removeEventListener('wheel',handler);
			if(e.type==='keydown'){
				if(d.settings.control.bind_to_layout){
					resolve(e.key);
				}else{
					resolve(e.code);
				}
			}else if(e.type==='mousedown'){
				resolve(`mouse${e.button}`);
			}else if(e.type==='wheel') {
				resolve(e.deltaY<0?'WheelUp':'WheelDown');
			}
		};
	document.addEventListener('keydown',handler);
	document.addEventListener('mousedown',handler);
	document.addEventListener('wheel',handler);
	});
}