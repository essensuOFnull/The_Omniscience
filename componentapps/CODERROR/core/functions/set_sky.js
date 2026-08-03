import create_skybox_materials from './create_skybox_materials';
export default function(path_part,extension,is_sphere=false) {
    let new_sky_path=`${path_part}/.${extension}`;
    if(new_sky_path==window.CODERROR.__originals__.data.current_sky_path)return
    /*Удаляем старый skybox с освобождением ресурсов*/
    if(window.CODERROR.__originals__.data.skybox){
        window.CODERROR.__originals__.data.three_scene.remove(window.CODERROR.__originals__.data.skybox);
        /*Освобождаем геометрию*/
        if(window.CODERROR.__originals__.data.skybox.geometry){
            window.CODERROR.__originals__.data.skybox.geometry.dispose();
        }
        /*Освобождаем материалы*/
        if(Array.isArray(window.CODERROR.__originals__.data.skybox.material)){
            window.CODERROR.__originals__.data.skybox.material.forEach(material=>{
                if(material.map)material.map.dispose();
                material.dispose();
            });
        }else if(window.CODERROR.__originals__.data.skybox.material){
            if(window.CODERROR.__originals__.data.skybox.material.map)window.CODERROR.__originals__.data.skybox.material.map.dispose();
            window.CODERROR.__originals__.data.skybox.material.dispose();
        }
    }
    /*Создаем новые материалы с обработкой ошибок*/
    try{
        let geometry=new THREE.BoxGeometry(5, 5, 5);
        let materials=create_skybox_materials(path_part,extension,is_sphere);
        window.CODERROR.__originals__.data.skybox=new THREE.Mesh(geometry, materials);
        window.CODERROR.__originals__.data.three_scene.add(window.CODERROR.__originals__.data.skybox);
    }catch(error){
        console.error('Error creating window.CODERROR.__originals__.data.skybox:',error);
    }
    window.CODERROR.__originals__.data.current_sky_path=new_sky_path;
}