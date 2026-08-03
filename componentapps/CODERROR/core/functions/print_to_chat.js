import create_element_from_HTML from './create_element_from_HTML';
export default function(message){
	let message_element=create_element_from_HTML(`<div>${message}</div>`);
	message_element.classList.add('message');
	window.CODERROR.__originals__.data.chat_preview.appendChild(message_element);
	message_element.addEventListener('animationend',()=>{
		message_element.remove();
	});
}