export default function layoutSwap(items, params, webContents) {
    if (params.selectionText && params.selectionText.trim()) {
        items.push({
            label: 'Поменять раскладку (исправить текст)',
            click: () => webContents.send('swap-layout')
        });
    }
}