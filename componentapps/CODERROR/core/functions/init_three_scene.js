export default function(){
    d.background_texture=PIXI.Texture.from(d.three_renderer.domElement);
    d.background_texture.baseTexture.autoUpdate=false;
    d.background_sprite=new PIXI.Sprite(d.background_texture);
    // Устанавливаем размер спрайта
    d.background_sprite.width=d.wrapper.clientWidth;
    d.background_sprite.height=d.wrapper.clientHeight;
    d.app.stage.addChildAt(d.background_sprite,0);
}