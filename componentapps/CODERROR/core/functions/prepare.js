export default function(preparation_func){
	if(!d.save.temp.room.preparation)return
	preparation_func();
	f.finish_preparation();
}