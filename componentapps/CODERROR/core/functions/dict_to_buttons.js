export default function(dict){
	let buttons=structuredClone(dict);
	for(let key in buttons){
		buttons[key]=f.create_button_from_text(buttons[key]);
	}
	return buttons;
}