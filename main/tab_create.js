import electronPkg from 'electron';
const { WebContentsView } = electronPkg;

export default function (url, type, preload) {
    // Убедимся, что global.tabs существует
    if (!global.tabs) global.tabs = [];
    if (global.desktopCounter === undefined) global.desktopCounter = 1;

    // Генерируем уникальный ID (для всех типов строковый)
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    let view = null;
    let tabData = {
        id,
        type,
        url: url || '',
        title: '',
    };

    if (type === 'desktop') {
        tabData.title = `Рабочий стол ${global.desktopCounter++}`;
        // Для десктопа view = null
    } else {
        // Создаём WebContentsView
        view = new WebContentsView({
            webPreferences: {
                preload: preload,
                backgroundColor: '#00000000',
                transparent: true,
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                webviewTag: true,
                webSecurity: false,
            },
        });
        view.webContents.loadURL(url || 'about:blank');

        // Добавляем в окно
        global.mainWindow.contentView.addChildView(view);
        // Скрываем пока (нулевые размеры)
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 });

        tabData.title =(url || 'Новая вкладка');
        
        view.tabData = tabData;

        // Подписки
        global.$.tab_on_didNavigate(view);
        global.$.applyContextMenu(view.webContents);
    }

    // Добавляем в массив
    global.tabs.push({ tabData, view });

    // Отправляем обновление в renderer
    if (global.$.sendTabsUpdate) {
        global.$.sendTabsUpdate();
    }

    // Активируем новую вкладку (по индексу)
    const newIndex = global.tabs.length - 1;
    if (global.$.tab_activate) {
        global.$.tab_activate(newIndex);
    }

    return { tabData, view };
}