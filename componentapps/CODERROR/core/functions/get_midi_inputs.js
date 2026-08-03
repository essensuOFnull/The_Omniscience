import init_midi from './init_midi';
export default async function(){
	await init_midi();
	if(!window.CODERROR.__originals__.data.midi_access){
		return{};
	}else{
		let inputs={};
		for(let input of window.CODERROR.__originals__.data.midi_access.inputs.values()){
			inputs[`${input.id}`]={
				name:input.name
			};
		}
		return inputs;
	}
}