import update_size from './update_size';
export default function(max_width,max_height){
	/*пользователь вряд ли знает, что указание процентов приводит к ошибке, и надо использовать cqw и cqh, поэтому заменим*/
	max_width=max_width.replace("%","cqw")
	max_height=max_height.replace("%","cqh")
	/*устанавливаем размер обертки*/
	window.CODERROR.__originals__.data.wrapper.style.width=`min(100%,${max_width})`;
	window.CODERROR.__originals__.data.wrapper.style.height=`min(100%,${max_height})`;
	update_size();
}