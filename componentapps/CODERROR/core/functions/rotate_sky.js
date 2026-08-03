export default function(x,y,z){
	if(!window.CODERROR.__originals__.data.skybox)return;
	window.CODERROR.__originals__.data.skybox.rotation.x+=x;
	window.CODERROR.__originals__.data.skybox.rotation.y+=y;
	window.CODERROR.__originals__.data.skybox.rotation.z+=z;
}