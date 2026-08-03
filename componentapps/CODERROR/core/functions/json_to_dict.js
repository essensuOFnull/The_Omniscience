export default function(file){
	return new Promise((resolve,reject)=>{
		let reader=new FileReader();
		reader.onload=e=>{
			try{
				resolve(JSON.parse(e.target.result));
			}catch(error){
				reject(error);
			}
		};
		reader.onerror=error=>reject(error);
		reader.readAsText(file);
	});
}