export default async function(files){
	let data=[];
	for(let file of files){
		let parsed=await f.json_to_dict(file);
		data.push(parsed);
	}
	return data;
}