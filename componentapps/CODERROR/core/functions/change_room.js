import read_file from './read_file';
import print_to_chat from './print_to_chat';

import _ from 'lodash';
export default function(room,preparation=true,reset_overlay=true){
    _.set(window.CODERROR.__originals__.data,['save','world','players',window.CODERROR.__originals__.data.save.player.nickname,'position','room_id'],room);
    _.set(window.CODERROR.__originals__.data,['save','temp','room','preparation'],preparation);
    if(!reset_overlay)return
    window.CODERROR.__originals__.data.overlay.innerHTML=``;
    
    // Загружаем функции комнаты (physics и render)
    if(window.CODERROR.__originals__.data.room_files_loaded !== room) {
        // Инициализируем дефолтные функции
        window.CODERROR.__originals__.data.current_room_physics = `()=>{}`;
        window.CODERROR.__originals__.data.current_room_render = `()=>{}`;
        
        // Загружаем physics функцию комнаты
        const physicsPromise = read_file(`rooms/physics/${room}.js`).then(content => {
            if(content){
                try {
                    window.CODERROR.__originals__.data.current_room_physics=content;
                } catch(error){
                    console.error(`Ошибка компилирования physics/${room}.js:`, error);
                    window.CODERROR.__originals__.data.current_room_physics=`()=>{}`;
                }
            }
        }).catch(error => {
            console.warn(`Physics файл для комнаты ${room} не найден`);
            window.CODERROR.__originals__.data.current_room_physics=`()=>{}`;
        });
        
        // Загружаем render функцию комнаты
        const renderPromise = read_file(`rooms/render/${room}.js`).then(content => {
            if(content){
                try {
                    window.CODERROR.__originals__.data.current_room_render=content;
                } catch(error){
                    console.error(`Ошибка компилирования render/${room}.js:`, error);
                    window.CODERROR.__originals__.data.current_room_render=`()=>{}`;
                }
            }
        }).catch(error => {
            console.warn(`Render файл для комнаты ${room} не найден`);
            window.CODERROR.__originals__.data.current_room_render=`()=>{}`;
        });
        
        // Устанавливаем флаг ТОЛЬКО после того, как оба файла загружены
        Promise.all([physicsPromise, renderPromise]).then(() => {
            window.CODERROR.__originals__.data.room_files_loaded = room;
            print_to_chat(window.CODERROR.__originals__.data.language.notifications.current_room(room));
        });
    }
}