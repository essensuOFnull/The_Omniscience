export default function(message){
	let message_element=f.create_element_from_HTML(`<div>${message}</div>`);
	message_element.classList.add('message');
	d.chat_preview.appendChild(message_element);
	message_element.addEventListener('animationend',()=>{
		message_element.remove();
	});
}