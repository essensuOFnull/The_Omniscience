import update_interface from './update_interface';
export default function(){
    if(d.loadable_save_data){
        d.save=_.merge({},d.save,d.loadable_save_data);
        d.loadable_save_data=null;
        update_interface();
    }
    d.save.temp.room.preparation=false;
}