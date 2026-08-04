import * as THREE from 'three';

export default function(){
    window.CODERROR.__originals__.data.three_camera=new THREE.PerspectiveCamera(
        50,
        window.CODERROR.__originals__.data.wrapper.clientWidth/window.CODERROR.__originals__.data.wrapper.clientHeight,
        0.1,
        1000
    );
    window.CODERROR.__originals__.data.three_camera.position.z=1;/*Камера внутри куба*/
}