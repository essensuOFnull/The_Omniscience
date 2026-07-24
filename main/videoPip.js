export default function videoPip(items, params, webContents) {
    items.push({
        label: 'Включить PiP для ближайшего видео',
        click: () => webContents.send('enable-pip')
    });
    items.push({
        label: 'Снять ограничения с видео на странице',
        click: () => webContents.send('lift-video-restrictions')
    });
}