import create_button_from_text from './create_button_from_text';
export default function(dict){
	let buttons=structuredClone(dict);
	for(let key in buttons){
		buttons[key]=create_button_from_text(buttons[key]);
	}
	return buttons;
}