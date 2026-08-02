// api.js
import JZZ from 'jzz';
import 'jzz-midi-smf';
import 'jzz-gui-player';

// Инициализация синтезатора будет отложена до первого использования
let synthInitialized = false;

async function initSynth() {
    if (synthInitialized) return;
    try {
        // Динамически импортируем синтезатор
        await import('jzz-synth-tiny');
        // После импорта он должен зарегистрироваться в JZZ.synth.Tiny
        if (JZZ.synth && JZZ.synth.Tiny) {
            JZZ.synth.Tiny.register('Web Audio Synth');
            synthInitialized = true;
            console.log('MIDI синтезатор инициализирован');
        } else {
            console.warn('Синтезатор Tiny не найден после импорта');
        }
    } catch (e) {
        console.warn('Ошибка загрузки jzz-synth-tiny:', e);
    }
}

let currentPlayer = null;

async function playMidi(byteArray) {
    await initSynth(); // убедимся, что синтезатор загружен
    if (!JZZ.synth || !JZZ.synth.Tiny) {
        console.error('Синтезатор не доступен');
        return { success: false, error: 'Synth not available' };
    }
    try {
        const synthOut = JZZ().openMidiOut('Web Audio Synth');
        if (!synthOut) {
            throw new Error('Не удалось открыть MIDI-выход "Web Audio Synth"');
        }
        const smf = new JZZ.MIDI.SMF(byteArray);
        const player = smf.player();
        player.connect(synthOut);
        currentPlayer = player;
        player.onEnd = () => playMidi(byteArray);
        player.play();
        return { success: true };
    } catch (e) {
        console.error('Ошибка воспроизведения:', e);
        return { success: false, error: e.message };
    }
}

function stopMidi() {
    if (currentPlayer) {
        currentPlayer.stop();
        currentPlayer = null;
        console.log('Воспроизведение остановлено');
        return { success: true };
    }
    console.log('Нет активного воспроизведения');
    return { success: false, error: 'No active playback' };
}

// Файловый менеджер – оставляем как есть
function getF() {
    if (!window.f) {
        throw new Error('File manager (window.f) не инициализирован');
    }
    return window.f;
}

export const fileAPI = {
    initFileAccess: async () => {
        await getF().init_file_access();
        return { success: true };
    },
    fileExists: async (relPath) => getF().file_exists(relPath),
    readFile: async (relPath, asText) => getF().read_file(relPath, asText),
    writeFile: async (relPath, content) => getF().write_file(relPath, content),
    createDirectory: async (relPath) => getF().create_directory(relPath),
    removeFile: async (relPath) => getF().remove_file(relPath),
    removeDirectory: async (relPath) => getF().remove_directory(relPath),
    listFiles: async (relPath) => getF().list_files(relPath),
    getSystemInfo: async () => getF().get_system_info(),
    getMidiInputs: async () => getF().get_midi_inputs(),
    getMidiOutputs: async () => getF().get_midi_outputs(),
};

export const midiAPI = {
    play: playMidi,
    stop: stopMidi,
};

export function changeTitle(title) {
    document.title = title;
    return { success: true };
}

export function setFileManager(fileManager) {
    window.f = fileManager;
}

window.CODERROR_API = { fileAPI, midiAPI, changeTitle };