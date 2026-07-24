export default function originalMenu(items, params, webContents) {
    items.push({
        label: 'Показать оригинальное меню сайта',
        click: () => webContents.send('show-original-menu')
    });
}