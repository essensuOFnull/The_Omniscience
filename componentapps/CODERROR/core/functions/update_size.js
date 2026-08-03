import update_symbols_grid from './update_symbols_grid';
import update_three_scene from './update_three_scene';
import init_three_scene from './init_three_scene';
export default function() {
    /*Получаем актуальные размеры контейнера*/
    let width=d.wrapper.clientWidth;
    let height=d.wrapper.clientHeight;
    /*Обновляем размеры рендерера PixiJS*/
    d.app.renderer.resize(width,height);
    update_symbols_grid();
	/*Обновляем способ масштабирования изображений*/
	if(window.updateStyleTokens) window.updateStyleTokens({ image_rendering: window.devicePixelRatio>=1?'pixelated':'auto' });
    /*Обновляем Three.js камеру и рендерер*/
    d.three_camera.aspect=width/height;
    d.three_camera.updateProjectionMatrix();
    d.three_renderer.setSize(width,height);
    /*Обновляем размер спрайта PixiJS*/
    if(d.background_sprite){
        d.background_sprite.width=width;
        d.background_sprite.height=height;
    }
    /*Принудительно обновляем текстуру*/
    update_three_scene();
    d.app.stage.removeChild(d.background_sprite);
    init_three_scene();
}