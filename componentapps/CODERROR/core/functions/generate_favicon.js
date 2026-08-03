import get_random_char from './get_random_char';
import get_random_color from './get_random_color';
export default function(){
	/*Очищаем холст*/
	d.favicon.ctx.clearRect(0,0,d.favicon.size,d.favicon.size);
	/*Настройки текста*/
	d.favicon.ctx.fillStyle=`#${get_random_color().toString(16).padStart(6,'0')}`;
	/*Рисуем символ*/
	d.favicon.ctx.fillText(get_random_char(),d.favicon.size/2,d.favicon.size/2);
	/*Обновляем иконку*/
	d.favicon.canvas.toBlob(blob=>{
		d.favicon.link.href=URL.createObjectURL(blob);
	},'image/png');
}