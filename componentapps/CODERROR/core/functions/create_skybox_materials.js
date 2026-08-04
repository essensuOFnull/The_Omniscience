import * as THREE from 'three';

export default function(path_part,extension,is_sphere) {
    let sides = ['right','left','top','bottom','front','back'];
    if(is_sphere){
        return sides.map(side => {
            let texture=window.CODERROR.__originals__.data.texture_loader.load(
                `${path_part}/${side}.${extension}`,
                undefined,/*onLoad*/
                undefined,/*onProgress*/
                (error)=>{
                    console.error('Error loading texture:',error);
                }
            );
            
            // Кастомный шейдерный материал
            return new THREE.ShaderMaterial({
                uniforms: {
                    map: { value: texture }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D map;
                    varying vec2 vUv;
                    
                    void main() {
                        // Сдвигаем координаты в центр [-1, 1]
                        vec2 centeredUV = (vUv - 0.5) * 2.0;
                        
                        // Рассчитываем расстояние от центра
                        float dist = length(centeredUV);
                        
                        // Коэффициент искажения на основе угла (используем PI)
                        float stretchFactor = cos(dist * 0.5 * 3.1415926535);
                        
                        // Применяем нелинейное растяжение
                        vec2 distortedUV = centeredUV * (1.0 + stretchFactor * 0.333333);
                        
                        // Возвращаем координаты в исходный диапазон [0, 1]
                        vec2 finalUV = (distortedUV * 0.5) + 0.5;
                        
                        gl_FragColor = texture2D(map, finalUV);
                    }
                `,
                side: THREE.BackSide,
                depthWrite: false
            });
        });
    }else{
        return sides.map(side=>{
            let texture=window.CODERROR.__originals__.data.texture_loader.load(
                `${path_part}/${side}.${extension}`,
                undefined,/*onLoad*/
                undefined,/*onProgress*/
                (error)=>{
                    console.error('Error loading texture:',error);
                }
            );
            return new THREE.MeshBasicMaterial({
                map:texture,
                side:THREE.BackSide,
            });
        });
    }
}