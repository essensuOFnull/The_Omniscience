import json_to_dict from './json_to_dict';
export default async function(files){
	let data=[];
	for(let file of files){
		let parsed=await json_to_dict(file);
		data.push(parsed);
	}
	return data;
}