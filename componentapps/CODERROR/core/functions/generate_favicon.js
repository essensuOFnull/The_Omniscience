import get_random_char from './get_random_char';
import get_random_color from './get_random_color';
export default function(){
	/*Очищаем холст*/
	window.CODERROR.__originals__.data.favicon.ctx.clearRect(0,0,window.CODERROR.__originals__.data.favicon.size,window.CODERROR.__originals__.data.favicon.size);
	/*Настройки текста*/
	window.CODERROR.__originals__.data.favicon.ctx.fillStyle=`#${get_random_color().toString(16).padStart(6,'0')}`;
	/*Рисуем символ*/
	window.CODERROR.__originals__.data.favicon.ctx.fillText(get_random_char(),window.CODERROR.__originals__.data.favicon.size/2,window.CODERROR.__originals__.data.favicon.size/2);
	/*Обновляем иконку*/
	window.CODERROR.__originals__.data.favicon.canvas.toBlob(blob=>{
		window.CODERROR.__originals__.data.favicon.link.href=URL.createObjectURL(blob);
	},'image/png');
}