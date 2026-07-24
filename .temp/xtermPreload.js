import electronPkg from 'electron';
const{contextBridge, ipcRenderer}=electronPkg;
import xtermPkg from '@xterm/xterm';
const {Terminal}=xtermPkg;
import {FitAddon} from '@xterm/addon-fit';


(function () {
    // Удаляем мета-теги CSP, чтобы разрешить eval
    document.addEventListener('DOMContentLoaded', () => {
        const cspMetas = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"], meta[http-equiv="content-security-policy"]');
        cspMetas.forEach(meta => meta.remove());
    });

    if (window.__omniscienceFilterInjected) return;
    window.__omniscienceFilterInjected = true;

    /* ============== Регистрация CSS-свойств ============== */
    

    /* ============== Вставка стилей (тема + анимация) ============== */
    
    function injectAllStyles() {
        if (!document.head) return false;
        const style = document.createElement('style');
        style.textContent = `/* === Определяем кастомные свойства как числа, чтобы анимация была плавной === */
@property --TheOmniscience-max-r {
  syntax: '<number>';
  inherits: true;
  initial-value: 128;
}
@property --TheOmniscience-max-g {
  syntax: '<number>';
  inherits: true;
  initial-value: 0;
}
@property --TheOmniscience-max-b {
  syntax: '<number>';
  inherits: true;
  initial-value: 128;
}
@property --TheOmniscience-target-alpha {
  syntax: '<number>';
  inherits: true;
  initial-value: 0.25;
}

@property --TheOmniscience-text-brightness {
  syntax: '<number>';
  inherits: true;
  initial-value: 255;
}

/* === Тема === */
:root {
  color-scheme: dark;
  --TheOmniscience-text-brightness: 255;
}

@media (prefers-color-scheme: light) {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
}
@media (prefers-color-scheme: dark) {
  body {
    background: #000000 !important;
    color: #ffffff !important;
  }
}
body, html, main {
  background: transparent !important;
}
.window {
  background: #000 !important;
}

/* === Анимация === */
:root {
  animation: set-magenta 0s linear;
}

@keyframes set-magenta {
  0%,
  100% { --TheOmniscience-max-r: 128; --TheOmniscience-max-g: 0; --TheOmniscience-max-b: 128; }
}`;  // экранируем на всякий случай
        document.head.appendChild(style);
        return true;
    }
    if (!injectAllStyles()) {
        const headObserver = new MutationObserver(() => {
            if (injectAllStyles()) headObserver.disconnect();
        });
        headObserver.observe(document.documentElement || document, { childList: true, subtree: true });
    }

    /* ============== Вспомогательные функции ============== */
    function parseColorToRGB(color) {
        const temp = document.createElement('div');
        temp.style.backgroundColor = color;
        temp.style.display = 'none';
        document.body.appendChild(temp);
        const computed = getComputedStyle(temp).backgroundColor;
        document.body.removeChild(temp);
        const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 } : null;
    }

    function colorToString(rgb) {
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;
    }

    function splitLayers(bgImage) {
        const layers = [];
        let depth = 0, start = 0;
        for (let i = 0; i < bgImage.length; i++) {
            if (bgImage[i] === '(') depth++;
            else if (bgImage[i] === ')') depth--;
            else if (bgImage[i] === ',' && depth === 0) {
                layers.push(bgImage.substring(start, i).trim());
                start = i + 1;
            }
        }
        layers.push(bgImage.substring(start).trim());
        return layers;
    }

    let gradIdCounter = 0;
    function getGradId(el) {
        if (!el._TheOmniscienceGradId) el._TheOmniscienceGradId = ++gradIdCounter;
        return el._TheOmniscienceGradId;
    }

    let textIdCounter = 0;
    function getTextId(el) {
        if (!el._TheOmniscienceTextId) el._TheOmniscienceTextId = ++textIdCounter;
        return el._TheOmniscienceTextId;
    }

    /* Фон */
    function colorExpression(varName) {
        return `rgba(from var(${varName}) `
            + `calc(min(var(--TheOmniscience-max-r), `
            + `min(var(--TheOmniscience-max-r), r) `
            + `+ (g - min(var(--TheOmniscience-max-g), g)) / 2 `
            + `+ (b - min(var(--TheOmniscience-max-b), b)) / 2`
            + `)) `
            + `calc(min(var(--TheOmniscience-max-g), `
            + `min(var(--TheOmniscience-max-g), g) `
            + `+ (r - min(var(--TheOmniscience-max-r), r)) / 2 `
            + `+ (b - min(var(--TheOmniscience-max-b), b)) / 2`
            + `)) `
            + `calc(min(var(--TheOmniscience-max-b), `
            + `min(var(--TheOmniscience-max-b), b) `
            + `+ (r - min(var(--TheOmniscience-max-r), r)) / 2 `
            + `+ (g - min(var(--TheOmniscience-max-g), g)) / 2`
            + `)) `
            + `/ var(--TheOmniscience-target-alpha)`;
    }

    /* Текст — просто добавляем дельту к каждому каналу */
    function textColorExpression(origVar, targetBrightnessVar) {
        const newCh = `calc(min(255, max(0, CH + (${targetBrightnessVar} - max(r, g, b)))))`;
        return `rgba(from var(${origVar}) `
            + newCh.replace(/CH/g, 'r') + ' '
            + newCh.replace(/CH/g, 'g') + ' '
            + newCh.replace(/CH/g, 'b')
            + ' / alpha)';
    }

    const processed = new WeakSet();
    const textProcessed = new WeakSet();

    function processElement(el) {
        if (!el || processed.has(el)) return;
        processed.add(el);

        // ======== фон (как раньше) ========
        const computed = getComputedStyle(el);
        const bgImage = computed.backgroundImage;
        const bgColor = computed.backgroundColor;
        const hasGradient = bgImage && bgImage !== 'none' && bgImage.includes('-gradient(');

        if (hasGradient) {
            const layers = splitLayers(bgImage);
            const newLayers = [];
            const gradId = getGradId(el);
            let colorIdx = 0;
            const colorRegex = /(#[0-9a-fA-F]{3,8}\b|(rgb|hsl)a?\([^)]+\))/g;

            for (const layer of layers) {
                if (layer.includes('-gradient(')) {
                    const newLayer = layer.replace(colorRegex, (match) => {
                        const varName = `--TheOmniscience-fg-${gradId}-${colorIdx}`;
                        const parsed = parseColorToRGB(match);
                        if (parsed) {
                            el.style.setProperty(varName, colorToString(parsed));
                        } else {
                            el.style.setProperty(varName, match);
                        }
                        colorIdx++;
                        return colorExpression(varName);
                    });
                    newLayers.push(newLayer);
                } else {
                    newLayers.push(layer);
                }
            }
            el.style.setProperty('background-image', newLayers.join(', '), 'important');
        } else if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
            const rgb = parseColorToRGB(bgColor);
            if (rgb && rgb.a > 0) {
                el.style.setProperty('--TheOmniscience-orig-bg', colorToString(rgb));
                el.style.setProperty('background-color', colorExpression('--TheOmniscience-orig-bg'), 'important');
            }
        }

        // ======== цвет текста ========
        processTextColor(el);
    }

    function processTextColor(el) {
        if (!el || textProcessed.has(el)) return;
        const parent = el.parentElement;
        const parentColor = parent ? getComputedStyle(parent).color : null;
        const myColor = getComputedStyle(el).color;

        // Пропускаем элементы с прозрачным цветом (не мешаем)
        if (myColor === 'rgba(0, 0, 0, 0)' || myColor === 'transparent') {
            textProcessed.add(el);
            return;
        }

        // Если цвет явно отличается от родительского — считаем, что он задан явно
        if (!parent || myColor !== parentColor) {
            const id = getTextId(el);
            const origVar = `--TheOmniscience-text-${id}`;
            el.style.setProperty(origVar, myColor);
            el.style.setProperty('color', textColorExpression(origVar, 'var(--TheOmniscience-text-brightness)'), 'important');
            textProcessed.add(el);
        } else {
            // Иначе цвет унаследован, не трогаем
            textProcessed.add(el);
        }
    }

    function reprocessElement(el) {
        processed.delete(el);
        textProcessed.delete(el);
        processElement(el);
    }

    /* ============== Запуск обработки ============== */
    function startProcessing() {
        // Обрабатываем всё существующее
        document.querySelectorAll('*').forEach(processElement);

        // Наблюдаем за изменениями
        new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            processElement(node);
                            node.querySelectorAll('*').forEach(processElement);
                        }
                    });
                } else if (m.type === 'attributes' && m.target.nodeType === 1) {
                    reprocessElement(m.target);
                }
            }
        }).observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startProcessing);
    } else {
        startProcessing();
    }
})();

contextBridge.exposeInMainWorld('electronTerminal',{
	createTerminal:(containerId)=>{
		const el=document.getElementById(containerId);
		if(!el) return;

		const term=new Terminal({
			cursorBlink:true,
			theme:{background:'#000000'}
		});

		const fitAddon = new FitAddon();
		term.loadAddon(fitAddon);

		term.open(el);

		fitAddon.fit();

		const dims = fitAddon.proportialDimensions;
		if(dims){
			ipcRenderer.send('terminal-resize', { cols: term.cols, rows: term.rows });
		}

		window.addEventListener('resize',()=>{
			fitAddon.fit();
			ipcRenderer.send('terminal-resize', { cols: term.cols, rows: term.rows });
		});

		ipcRenderer.on('terminal-incoming-data',(event,data)=>{
			term.write(data);
		});

		term.onData((data)=>ipcRenderer.send('terminal-out-data',data));
	}
});
