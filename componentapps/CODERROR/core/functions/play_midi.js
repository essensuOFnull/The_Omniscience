export default function(byteArray, deviceId) {
    // deviceId пока игнорируется – при необходимости можно расширить API
    return window.CODERROR_API.midiAPI.play(byteArray);
}