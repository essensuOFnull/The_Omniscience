import update_interface from './update_interface';

import _ from 'lodash';
export default function(){
    if(window.CODERROR.__originals__.data.loadable_save_data){
        window.CODERROR.__originals__.data.save=_.merge({},window.CODERROR.__originals__.data.save,window.CODERROR.__originals__.data.loadable_save_data);
        window.CODERROR.__originals__.data.loadable_save_data=null;
        update_interface();
    }
    window.CODERROR.__originals__.data.save.temp.room.preparation=false;
}