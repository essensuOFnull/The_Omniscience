export default function(player=_.get(d,['save','player'])){
    let basePath=['save','world','players',player.nickname],
    player_nickname=_.get(player,['nickname']);
    //Символическое представление игрока
    if(_.get(player,['is_symbolic'])){
        /*расчет скина игрока*/
        const fractional=[false,false];
        for(let i=0;i<=1;i++){
            const coord=_.get(d,[...basePath,'position','coordinates',i]);
            if(coord/d.logical_symbol_size!==Math.floor(coord/d.logical_symbol_size)){
                fractional[i]=true;
            }
        }
        const player_skin=(fractional[0]?(fractional[1]?'▗▖\n▝▘':'▐▌'):(fractional[1]?'▄\n▀':'█'));
        /*отрисовка игрока*/
        f.focus_camera_on_player();
        const coord0=_.get(d,[...basePath,'position','coordinates',0]);
        const coord1=_.get(d,[...basePath,'position','coordinates',1]);
        let rendering_coordinates=[f.logical_to_screen(coord0)-(_.get(d,['save','temp','camera',0])||d.save.temp.camera&&d.save.temp.camera[0]||0),f.logical_to_screen(coord1)-(_.get(d,['save','temp','camera',1])||d.save.temp.camera&&d.save.temp.camera[1]||0)];
        if(fractional[0]) rendering_coordinates[0]--;
        if(fractional[1]) rendering_coordinates[1]--;
        f.print_text_to_symbols_grid(player_skin,rendering_coordinates[0]/d.symbol_size,rendering_coordinates[1]/d.symbol_size);
    }
    //Ник над персонажем — создаётся один раз и потом только перемещается
    if(!d.nickname_labels)d.nickname_labels=new Map();
    //Вычисляем центр верхней границы коллайдера в логических координатах
    let collider=[...basePath,'position','collider'],
    x=(_.get(d,[...collider,0,0])+_.get(d,[...collider,1,0]))/2,
    y=_.get(d,[...collider,0,1]);
    //Переводим в экранные пиксели
    let camera=['save','temp','camera'],
    screen_x=Math.round(f.logical_to_screen(x)-_.get(d,[...camera,0],0)),
    screen_y=Math.round(f.logical_to_screen(y)-_.get(d,[...camera,1],0));
    //Смещаем надпись над головой на расстояние d.symbol_size
    screen_y-=d.symbol_size;

    let label = d.nickname_labels.get(player_nickname);
    if(!label){
        // Создаём контейнер с фоном и текстом (полупрозрачный чёрный фон, alpha = 0.5)
        let container = new PIXI.Container();
        let font_size = d.symbol_size;
        let nick_text = player_nickname ? String(player_nickname) : '';
        let text = new PIXI.Text(nick_text, {
            fontFamily: 'CODERROR',
            fontSize: font_size,
            fill: 0xFFFFFF,
            align: 'center'
        });

        // Use a conservative resolution (based on devicePixelRatio) instead of a large fixed value
        text.resolution = Math.max(1, Math.round(window.devicePixelRatio || 1));
        text.roundPixels = true;
        if(text.anchor) text.anchor.set(0.5, 1);
        else text.pivot.set(text.width/2, text.height);

        let paddingX = Math.ceil(d.symbol_size * 0.4);
        let paddingY = Math.ceil(d.symbol_size * 0.25);
        let bounds = text.getLocalBounds();
        let bg = new PIXI.Graphics();

        bg.beginFill(0x000000, 0.5);
        bg.drawRoundedRect(-bounds.width/2 - paddingX, -bounds.height - paddingY, bounds.width + paddingX*2, bounds.height + paddingY*1.5, Math.max(2, paddingY));
        bg.endFill();

        container.addChild(bg);
        container.addChild(text);

        // store references and paddings for later updates
        container._bg = bg;
        container._text = text;
        container._paddingX = paddingX;
        container._paddingY = paddingY;

        d.app.stage.addChild(container);
        d.nickname_labels.set(player_nickname, container);
        label = container;
    } else {
        // If nickname text changed (rare), update text and re-cache the bitmap
        let t = label._text;
        let desired = player_nickname ? String(player_nickname) : '';
        if(t.text !== desired){
            try{
                t.cacheAsBitmap = false;
            }catch(e){}
            t.text = desired;
            // redraw background size to fit new bounds
            let paddingX = label._paddingX || Math.ceil(d.symbol_size * 0.4);
            let paddingY = label._paddingY || Math.ceil(d.symbol_size * 0.25);
            let bounds = t.getLocalBounds();
            label._bg.clear();
            label._bg.beginFill(0x000000, 0.5);
            label._bg.drawRoundedRect(-bounds.width/2 - paddingX, -bounds.height - paddingY, bounds.width + paddingX*2, bounds.height + paddingY*1.5, Math.max(2, paddingY));
            label._bg.endFill();
            try{
                t.cacheAsBitmap = true;
                label._bg.cacheAsBitmap = true;
                label.cacheAsBitmap = true;
            }catch(e){}
        }
    }

    // Only update position if it actually changed — avoids marking transforms every frame
    if(label.position.x !== screen_x || label.position.y !== screen_y){
        label.position.set(screen_x, screen_y);
    }
}