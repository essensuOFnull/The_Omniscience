export default function(){
    window.CODERROR.__originals__.data.background_texture=PIXI.Texture.from(window.CODERROR.__originals__.data.three_renderer.domElement);
    window.CODERROR.__originals__.data.background_texture.baseTexture.autoUpdate=false;
    window.CODERROR.__originals__.data.background_sprite=new PIXI.Sprite(window.CODERROR.__originals__.data.background_texture);
    // Устанавливаем размер спрайта
    window.CODERROR.__originals__.data.background_sprite.width=window.CODERROR.__originals__.data.wrapper.clientWidth;
    window.CODERROR.__originals__.data.background_sprite.height=window.CODERROR.__originals__.data.wrapper.clientHeight;
    window.CODERROR.__originals__.data.app.stage.addChildAt(window.CODERROR.__originals__.data.background_sprite,0);
}