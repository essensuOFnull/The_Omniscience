export default function(){
	/*Обновляем Three.js сцену*/
	d.three_renderer.render(d.three_scene,d.three_camera);
	/*Принудительное обновление текстуры в PixiJS*/
	d.background_texture.baseTexture.update();
}