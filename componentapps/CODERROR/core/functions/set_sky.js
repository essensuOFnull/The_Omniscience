export default function(path_part,extension,is_sphere=false) {
    let new_sky_path=`${path_part}/.${extension}`;
    if(new_sky_path==d.current_sky_path)return
    /*Удаляем старый skybox с освобождением ресурсов*/
    if(d.skybox){
        d.three_scene.remove(d.skybox);
        /*Освобождаем геометрию*/
        if(d.skybox.geometry){
            d.skybox.geometry.dispose();
        }
        /*Освобождаем материалы*/
        if(Array.isArray(d.skybox.material)){
            d.skybox.material.forEach(material=>{
                if(material.map)material.map.dispose();
                material.dispose();
            });
        }else if(d.skybox.material){
            if(d.skybox.material.map)d.skybox.material.map.dispose();
            d.skybox.material.dispose();
        }
    }
    /*Создаем новые материалы с обработкой ошибок*/
    try{
        let geometry=new THREE.BoxGeometry(5, 5, 5);
        let materials=f.create_skybox_materials(path_part,extension,is_sphere);
        d.skybox=new THREE.Mesh(geometry, materials);
        d.three_scene.add(d.skybox);
    }catch(error){
        console.error('Error creating d.skybox:',error);
    }
    d.current_sky_path=new_sky_path;
}