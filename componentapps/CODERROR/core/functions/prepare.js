import finish_preparation from './finish_preparation';
export default function(preparation_func){
	if(!window.CODERROR.__originals__.data.save.temp.room.preparation)return
	preparation_func();
	finish_preparation();
}