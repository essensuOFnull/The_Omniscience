export default function(placeholder='',removable=false){
	let textarea=f.create_element_from_HTML('<textarea/>');
	textarea.style.cursor='pointer';
	textarea.style.background='#00000000';
	textarea.placeholder=placeholder;
	let frame=f.wrap_in_frame(textarea,`<button style='background:#000;'/>`,removable);
	frame.addEventListener('click',(e)=>{
		textarea.focus();
	})
	return[frame,textarea];
}