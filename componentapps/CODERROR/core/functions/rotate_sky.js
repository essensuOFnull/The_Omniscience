export default function(x,y,z){
	if(!d.skybox)return;
	d.skybox.rotation.x+=x;
	d.skybox.rotation.y+=y;
	d.skybox.rotation.z+=z;
}