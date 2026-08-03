export default function(fontName, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Таймаут загрузки шрифта'));
        }, timeout);

        // Периодическая проверка
        const check = () => {
            if (document.fonts.check(`16px "${fontName}"`)) {
                clearTimeout(timer);
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        
        check();
    });
}