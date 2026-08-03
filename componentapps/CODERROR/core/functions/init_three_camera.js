export default function(){
    d.three_camera=new THREE.PerspectiveCamera(
        50,
        d.wrapper.clientWidth/d.wrapper.clientHeight,
        0.1,
        1000
    );
    d.three_camera.position.z=1;/*Камера внутри куба*/
}