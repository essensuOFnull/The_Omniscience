import electronPkg from 'electron';
const{Menu}=electronPkg;

export default function (index, x, y) {
    const tab = global.tabs[index];
    if (!tab) return;

    const template = [];

    // Навигация только для веб-вкладок
    if (tab.tabData.type === 'web') {
        template.push({
            label: '⬅️ Назад',
            enabled: !!tab.webContents?.canGoBack(),
            click: () => global.$.tab_go_back(index)
        });
        template.push({
            label: '➡️ Вперед',
            enabled: !!tab.webContents?.canGoForward(),
            click: () => global.$.tab_go_forward(index)
        });
        template.push({ type: 'separator' });
    }

    template.push({
        label: '❌ Закрыть',
        click: () => {
            global.$.tab_close(index);
            global.$.tabs_send_updated();
        }
    });

    template.push({
        label: '📋 Дублировать',
        click: () => {
            const url = tab.tabData.url || global.config.viteBase+'/';
            const type = tab.tabData.type;
            global.$.tab_create(url, type);
            global.$.tabs_send_updated();
        }
    });

    if (tab.tabData.type === 'web') {
        template.push({
            label: '✏️ Изменить URL',
            click: () => global.tabBar.webContents.send('tab_edit_url', index)
        });
    }

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: global.tabBar, x: Math.round(x), y: Math.round(y) });
}