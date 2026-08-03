import init_midi from './init_midi';
export default async function() {
    await init_midi();
    if (!window.CODERROR.__originals__.data.midi_access) return {};
    let outputs = {};
    for (let output of window.CODERROR.__originals__.data.midi_access.outputs.values()) {
        outputs[output.id] = { name: output.name };
    }
    return outputs;
}