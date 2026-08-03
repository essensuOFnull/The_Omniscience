import update_activated_actions from './update_activated_actions';
export default function(){
	let getKey=(e)=>{
		if(e.type.startsWith('key')){
			return d.settings.control.bind_to_layout?e.key:e.code;
		}else if(e.type.startsWith('mouse')&&e.type!=='wheel'){
			return`mouse${e.button}`;
		}else if(e.type==='wheel'){
			return e.deltaY<0?'WheelUp':'WheelDown';
		}
	};
	let handleEvent=(e)=>{
		if(e.repeat||d.ignored_keys.includes(e.code))return/*Отключаем автоповтор*/
		let key=getKey(e);
		if(e.type==='keydown'||e.type==='mousedown'||e.type==='wheel'){
			d.pressed.add(key);
		}else{
			d.pressed.delete(key);
		}
		update_activated_actions();
	};
	document.addEventListener('keydown',handleEvent);
	document.addEventListener('keyup',handleEvent);
	document.addEventListener('mousedown',handleEvent);
	document.addEventListener('mouseup',handleEvent);
	document.addEventListener('wheel', handleEvent);
	return{
		stop_tracking:()=>{
			document.removeEventListener('keydown',handleEvent);
			document.removeEventListener('keyup',handleEvent);
			document.removeEventListener('mousedown',handleEvent);
			document.removeEventListener('mouseup',handleEvent);
			document.removeEventListener('wheel', handleEvent);
		}
	};
}