import change_button_border_color from './change_button_border_color';
import change_button_text_color from './change_button_text_color';
export default function(button,color){
	change_button_border_color(button,color);
	change_button_text_color(button,color);
}