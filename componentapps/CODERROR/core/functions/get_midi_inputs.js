export default async function(){
	await f.init_midi();
	if(!d.midi_access){
		return{};
	}else{
		let inputs={};
		for(let input of d.midi_access.inputs.values()){
			inputs[`${input.id}`]={
				name:input.name
			};
		}
		return inputs;
	}
}