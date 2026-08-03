import create_element_from_HTML from './create_element_from_HTML';
import wrap_in_frame from './wrap_in_frame';
export default function(placeholder='',removable=false){
	let textarea=create_element_from_HTML('<textarea/>');
	textarea.style.cursor='pointer';
	textarea.style.background='#00000000';
	textarea.placeholder=placeholder;
	let frame=wrap_in_frame(textarea,`<button style='background:#000;'/>`,removable);
	frame.addEventListener('click',(e)=>{
		textarea.focus();
	})
	return[frame,textarea];
}