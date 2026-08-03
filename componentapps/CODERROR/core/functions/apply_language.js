export default function(name_list){
    name_list=['default'].concat(name_list);
    let languages_list=[];
    for(name of name_list){
        languages_list.push(d.languages[name]);
    }
    d.language=_.merge({},...languages_list);
}