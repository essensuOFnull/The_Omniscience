(async () => {
	if (window.__contextMenuIpcInstalled) return;
	window.__contextMenuIpcInstalled = true;

    const { ipcRenderer } = await import('electron');

    // ============ Хранение последнего контекстного клика ============
    let lastTarget = null;
    let lastEvent = null;
    document.addEventListener('contextmenu', (e) => {
        lastTarget = e.target;
        lastEvent = e;
    }, true);

    // ============ Поиск видео ============
    function findNearestVideo(element) {
        function searchShadow(node) {
            if (node.nodeType === 1 && node.shadowRoot) {
                const v = node.shadowRoot.querySelector('video');
                if (v) return v;
                for (const child of node.shadowRoot.children) {
                    const found = searchShadow(child);
                    if (found) return found;
                }
            }
            return null;
        }
        let el = element;
        while (el) {
            if (el.tagName === 'VIDEO') return el;
            const inside = el.querySelector('video');
            if (inside) return inside;
            if (el.shadowRoot) {
                const inShadow = el.shadowRoot.querySelector('video');
                if (inShadow) return inShadow;
                for (const child of el.shadowRoot.children) {
                    const found = searchShadow(child);
                    if (found) return found;
                }
            }
            el = el.parentElement || el.getRootNode?.()?.host;
        }
        return null;
    }

    function getAllVideos(root = document) {
        let videos = [];
        if (root.querySelectorAll) root.querySelectorAll('video').forEach(v => videos.push(v));
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
            acceptNode: node => node.shadowRoot ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
        });
        while (walker.nextNode()) {
            const host = walker.currentNode;
            if (host.shadowRoot) videos = videos.concat(getAllVideos(host.shadowRoot));
        }
        return videos;
    }

    // ============ Смена раскладки ============
    const ruToEn = { 'а':'f','б':',','в':'d','г':'u','д':'l','е':'t','ё':'`','ж':';','з':'p','и':'b','й':'q','к':'r','л':'k','м':'v','н':'y','о':'j','п':'g','р':'h','с':'c','т':'n','у':'e','ф':'a','х':'[','ц':'w','ч':'x','ш':'i','щ':'o','ъ':']','ы':'s','ь':'m','э':"'",'ю':'.','я':'z','А':'F','Б':'<','В':'D','Г':'U','Д':'L','Е':'T','Ё':'~','Ж':':','З':'P','И':'B','Й':'Q','К':'R','Л':'K','М':'V','Н':'Y','О':'J','П':'G','Р':'H','С':'C','Т':'N','У':'E','Ф':'A','Х':'{','Ц':'W','Ч':'X','Ш':'I','Щ':'O','Ъ':'}','Ы':'S','Ь':'M','Э':'"','Ю':'>','Я':'Z' };
    const enToRu = Object.fromEntries(Object.entries(ruToEn).map(([ru, en]) => [en, ru]));

    function swapLayout(text) {
        return text.split('').map(ch => ruToEn[ch] || enToRu[ch] || ch).join('');
    }

    // ============ Обработчики IPC ============
    ipcRenderer.on('swap-layout', () => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const text = range.toString();
        if (!text) return;
        range.deleteContents();
        range.insertNode(document.createTextNode(swapLayout(text)));
        sel.removeAllRanges();
    });

    ipcRenderer.on('enable-pip', async () => {
        let videos = getAllVideos();
        if (lastTarget) {
            const nearest = findNearestVideo(lastTarget);
            if (nearest) videos = [nearest, ...videos.filter(v => v !== nearest)];
        }
        for (const video of videos) {
            video.disablePictureInPicture = false;
            if (document.pictureInPictureElement === video) continue;
            try { await video.requestPictureInPicture(); return; } catch (e) {}
        }
        alert('Не удалось включить PiP ни для одного видео.');
    });

    ipcRenderer.on('lift-video-restrictions', () => {
        document.querySelectorAll('video').forEach(video => {
            ['disablePictureInPicture','controlslist','disableremoteplayback','oncontextmenu','x-webkit-airplay']
                .forEach(attr => video.removeAttribute(attr));
            video.disablePictureInPicture = false;
            video.controlsList?.remove?.('nodownload');
            video.disableRemotePlayback = false;
        });
    });

    ipcRenderer.on('show-original-menu', () => {
        if (!lastTarget || !lastEvent) return;
        const opts = {
            bubbles: true, cancelable: true,
            button: 2, buttons: 2,
            clientX: lastEvent.clientX, clientY: lastEvent.clientY,
            screenX: lastEvent.screenX, screenY: lastEvent.screenY
        };
        const ev = new MouseEvent('contextmenu', opts);
        Object.defineProperty(ev, 'isExtensionForcedOriginal', { value: true });
        lastTarget.dispatchEvent(ev);
    });
})();