import finish_preparation from './finish_preparation';
export default function(preparation_func){
	if(!d.save.temp.room.preparation)return
	preparation_func();
	finish_preparation();
}