import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

async function createPreload(key, content, tmpDir) {
    const fileName = `${key}.cjs`;
    const filePath = path.join(tmpDir, fileName);
    await writeFile(filePath, content, 'utf-8');
    global.paths[key] = filePath.replace(/\\/g, '/');
}

function buildThemeCSS(scheme) {
    return `
    :root { color-scheme: ${scheme.web}; }
    @media (prefers-color-scheme: light) {
        body { background: ${scheme.light.background} !important; color: ${scheme.light.color} !important; }
    }
    @media (prefers-color-scheme: dark) {
        body { background: ${scheme.dark.background} !important; color: ${scheme.dark.color} !important; }
    }
    body, html, main { background: transparent !important; }
    .window { background: #000 !important; }
    `;
}

function buildAnimationCSS(scheme) {
    const keyframesDef = scheme.keyframes.map(kf =>
        `${kf.percent} { --TheOmniscience-max-r: ${kf.r}; --TheOmniscience-max-g: ${kf.g}; --TheOmniscience-max-b: ${kf.b}; }`
    ).join('\n');
    return `
    :root {
        animation: purple-cycle ${scheme.duration} ${scheme.timing} ${scheme.iteration};
    }
    @keyframes purple-cycle {
        ${keyframesDef}
    }
    `;
}

function buildRegisterPropertiesCode(scheme) {
    return `
    if (window.CSS && CSS.registerProperty) {
        const props = [
            { name: '--TheOmniscience-max-r', syntax: '<number>', inherits: true, initialValue: ${scheme.initialMaxR} },
            { name: '--TheOmniscience-max-g', syntax: '<number>', inherits: true, initialValue: ${scheme.initialMaxG} },
            { name: '--TheOmniscience-max-b', syntax: '<number>', inherits: true, initialValue: ${scheme.initialMaxB} },
            { name: '--TheOmniscience-target-alpha', syntax: '<number>', inherits: true, initialValue: ${scheme.initialTargetAlpha} }
        ];
        for (const cfg of props) {
            try { CSS.registerProperty(cfg); } catch (e) {}
        }
    }`;
}

function buildInjectStylesFunction(combinedCSS) {
    return `
    function injectAllStyles() {
        if (!document.head) return false;
        const style = document.createElement('style');
        style.textContent = \`${combinedCSS}\`;
        document.head.appendChild(style);
        return true;
    }
    // ждём head
    if (!injectAllStyles()) {
        const headObserver = new MutationObserver(() => {
            if (injectAllStyles()) headObserver.disconnect();
        });
        headObserver.observe(document.documentElement || document, { childList: true, subtree: true });
    }`;
}

export default async function () {
    const tmpDir = path.join(global.paths.projectRoot, '.temp');
    await mkdir(tmpDir, { recursive: true });

    // Загрузка цветовой схемы (теперь это CSS)
    const colorSchemeName = global.config.color_scheme || 'default';
    const schemesDir = path.join(global.paths.projectRoot, 'themes', 'color_schemes');
    const schemePath = path.join(schemesDir, `${colorSchemeName}.css`);
    let schemeCSS;
    try {
        schemeCSS = await readFile(schemePath, 'utf-8');
        console.log(`[Preloads] Color scheme "${colorSchemeName}" loaded.`);
    } catch (err) {
        console.error(`[Preloads] Failed to load color scheme "${colorSchemeName}":`, err.message);
        // fallback — можно вставить минимальный дефолтный CSS прямо здесь
        schemeCSS = `/* default fallback */ :root { color-scheme: dark; }`;
    }

    // Вместо регистрации свойств и генерации стилей — просто подставляем CSS
    const injectStylesCode = `
    function injectAllStyles() {
        if (!document.head) return false;
        const style = document.createElement('style');
        style.textContent = \`${schemeCSS.replace(/`/g, '\\`')}\`;  // экранируем на всякий случай
        document.head.appendChild(style);
        return true;
    }
    if (!injectAllStyles()) {
        const headObserver = new MutationObserver(() => {
            if (injectAllStyles()) headObserver.disconnect();
        });
        headObserver.observe(document.documentElement || document, { childList: true, subtree: true });
    }`;

    // Читаем шаблон фильтра
    const coreTemplate = await readFile(
        path.join(global.paths.projectRoot, 'texts', 'css_filter_core.js'), 'utf-8'
    );

    // Плейсхолдеры: убираем __REGISTER_PROPERTIES__ (он не нужен), заменяем __INJECT_STYLES__
    let finalFilterCode = coreTemplate
        .replace('/* __REGISTER_PROPERTIES__ */', '')  // регистрация больше не нужна
        .replace('/* __INJECT_STYLES__ */', injectStylesCode);

    global._.theme_css_filter = finalFilterCode;

    // === Генерация preload-файлов ===
    await Promise.all([
        createPreload('reactPreload', `${global._.imports}\n\n${finalFilterCode}\n\n${global._.mainWindow_ipc}\n\n${global._.tabbar_ipc}\n\n${global._.desktop_ipc}\n\n${global._.xterm_ipc}`, tmpDir),
        createPreload('webtabPreload', `${global._.imports}\n\n${finalFilterCode}`, tmpDir),
        createPreload('xtermPreload', `${global._.imports}\n\n${finalFilterCode}\n\n${global._.xterm_ipc}`, tmpDir),
    ]);
}
