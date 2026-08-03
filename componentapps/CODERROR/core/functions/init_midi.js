export default async function(){
	try{
		d.midi_access=await navigator.requestMIDIAccess();
	}catch(e){
		console.error('Ошибка доступа к MIDI:',error);
	}
}