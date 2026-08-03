import change_button_border_color from './change_button_border_color';
import check_hover from './check_hover';
export default function(drop_zone=window.CODERROR.__originals__.data.save.temp.room.data.drop_zone){
	change_button_border_color(drop_zone,(check_hover(drop_zone)?'#f0f':'#fff'));
}