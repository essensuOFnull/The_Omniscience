import create_worlds_list from './create_worlds_list';
export default function(){
	d.save.temp.room.data.worlds_list_div.replaceChildren(create_worlds_list());
}