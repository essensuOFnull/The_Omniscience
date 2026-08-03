import update_symbols_grid from './update_symbols_grid';
import update_three_scene from './update_three_scene';
import init_three_scene from './init_three_scene';
export default function() {
    /*Получаем актуальные размеры контейнера*/
    let width=window.CODERROR.__originals__.data.wrapper.clientWidth;
    let height=window.CODERROR.__originals__.data.wrapper.clientHeight;
    /*Обновляем размеры рендерера PixiJS*/
    window.CODERROR.__originals__.data.app.renderer.resize(width,height);
    update_symbols_grid();
	/*Обновляем способ масштабирования изображений*/
	if(window.updateStyleTokens) window.updateStyleTokens({ image_rendering: window.devicePixelRatio>=1?'pixelated':'auto' });
    /*Обновляем Three.js камеру и рендерер*/
    window.CODERROR.__originals__.data.three_camera.aspect=width/height;
    window.CODERROR.__originals__.data.three_camera.updateProjectionMatrix();
    window.CODERROR.__originals__.data.three_renderer.setSize(width,height);
    /*Обновляем размер спрайта PixiJS*/
    if(window.CODERROR.__originals__.data.background_sprite){
        window.CODERROR.__originals__.data.background_sprite.width=width;
        window.CODERROR.__originals__.data.background_sprite.height=height;
    }
    /*Принудительно обновляем текстуру*/
    update_three_scene();
    window.CODERROR.__originals__.data.app.stage.removeChild(window.CODERROR.__originals__.data.background_sprite);
    init_three_scene();
}