import _ from 'lodash';
export default function(name_list){
    name_list=['default'].concat(name_list);
    let languages_list=[];
    for(name of name_list){
        languages_list.push(window.CODERROR.__originals__.data.languages[name]);
    }
    window.CODERROR.__originals__.data.language=_.merge({},...languages_list);
}