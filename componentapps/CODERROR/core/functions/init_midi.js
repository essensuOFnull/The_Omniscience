export default async function(){
	try{
		window.CODERROR.__originals__.data.midi_access=await navigator.requestMIDIAccess();
	}catch(e){
		console.error('Ошибка доступа к MIDI:',error);
	}
}