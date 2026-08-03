import get_transparent_space_text from './get_transparent_space_text';
export default function(button,text){
	button.querySelector('#frame_content').innerHTML=get_transparent_space_text(text);
}