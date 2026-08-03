export default function() {
    // Базовый список шрифтов для проверки
    const fonts = [
        'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
        'Verdana', 'Georgia', 'Palatino', 'Garamond',
        'Bookman', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black',
        'Impact'
    ];
    
    const available = [];
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.style.fontSize = '72px';
    
    document.body.appendChild(div);
    
    fonts.forEach(font => {
        div.style.fontFamily = font;
        if (div.offsetWidth !== div.offsetHeight) {
            available.push(font);
        }
    });
    
    document.body.removeChild(div);
    return available;
}