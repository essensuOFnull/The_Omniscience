export default function(){
	/*Обновляем Three.js сцену*/
	window.CODERROR.__originals__.data.three_renderer.render(window.CODERROR.__originals__.data.three_scene,window.CODERROR.__originals__.data.three_camera);
	/*Принудительное обновление текстуры в PixiJS*/
	window.CODERROR.__originals__.data.background_texture.baseTexture.update();
}