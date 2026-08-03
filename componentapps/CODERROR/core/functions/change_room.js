import read_file from './read_file';
import print_to_chat from './print_to_chat';
export default function(room,preparation=true,reset_overlay=true){
    _.set(d,['save','world','players',d.save.player.nickname,'position','room_id'],room);
    _.set(d,['save','temp','room','preparation'],preparation);
    if(!reset_overlay)return
    d.overlay.innerHTML=``;
    
    // Загружаем функции комнаты (physics и render)
    if(d.room_files_loaded !== room) {
        // Инициализируем дефолтные функции
        d.current_room_physics = `()=>{}`;
        d.current_room_render = `()=>{}`;
        
        // Загружаем physics функцию комнаты
        const physicsPromise = read_file(`rooms/physics/${room}.js`).then(content => {
            if(content){
                try {
                    d.current_room_physics=content;
                } catch(error){
                    console.error(`Ошибка компилирования physics/${room}.js:`, error);
                    d.current_room_physics=`()=>{}`;
                }
            }
        }).catch(error => {
            console.warn(`Physics файл для комнаты ${room} не найден`);
            d.current_room_physics=`()=>{}`;
        });
        
        // Загружаем render функцию комнаты
        const renderPromise = read_file(`rooms/render/${room}.js`).then(content => {
            if(content){
                try {
                    d.current_room_render=content;
                } catch(error){
                    console.error(`Ошибка компилирования render/${room}.js:`, error);
                    d.current_room_render=`()=>{}`;
                }
            }
        }).catch(error => {
            console.warn(`Render файл для комнаты ${room} не найден`);
            d.current_room_render=`()=>{}`;
        });
        
        // Устанавливаем флаг ТОЛЬКО после того, как оба файла загружены
        Promise.all([physicsPromise, renderPromise]).then(() => {
            d.room_files_loaded = room;
            print_to_chat(d.language.notifications.current_room(room));
        });
    }
}