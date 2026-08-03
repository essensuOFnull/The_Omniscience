import change_room from './change_room';
export default function(data){
    d.loadable_save_data=_.cloneDeep(data);
    change_room(d.save.world.players[d.save.player.nickname].position.room_id);
}