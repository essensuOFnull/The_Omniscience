export default async function() {
    await f.init_midi();
    if (!d.midi_access) return {};
    let outputs = {};
    for (let output of d.midi_access.outputs.values()) {
        outputs[output.id] = { name: output.name };
    }
    return outputs;
}