import get_symbol_texture from './get_symbol_texture';

import * as PIXI from 'pixi.js';
export default function(char) {
    const info = window.CODERROR.__originals__.data.symbols_atlas_map[char];
    if (!info) {
        return get_symbol_texture(' ');
    }
    
    const atlas = window.CODERROR.__originals__.data.symbols_atlases[info.atlasIndex];
    if (!atlas) {
        console.warn(`Atlas ${info.atlasIndex} not found for char: ${char}`);
        return get_symbol_texture(' ');
    }
    
    const size = window.CODERROR.__originals__.data.symbol_size;
    const cols = atlas.cols;
    
    const col = info.charIndex % cols;
    const row = Math.floor(info.charIndex / cols);
    
    const x = col * size;
    const y = row * size;
    
    // Создаем прямоугольник (frame) для вырезания
    const frame = new PIXI.Rectangle(x, y, size, size);
    
    // Создаем новую текстуру, используя исходную текстуру и frame
    const subTexture = new PIXI.Texture({
        source: atlas.texture.source,
        frame: frame
    });
    
    return subTexture;
}