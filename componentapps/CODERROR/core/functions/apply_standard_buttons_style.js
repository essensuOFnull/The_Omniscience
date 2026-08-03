import change_button_color from './change_button_color';
import check_hover from './check_hover';
import get_random_true_str_color from './get_random_true_str_color';
export default function(buttons=d.save.temp.room.data.buttons){
	Object.entries(buttons).forEach(([name,el])=>{
		change_button_color(el,(check_hover(el)?get_random_true_str_color():'#fff'));
	});
}