(function () {
	if (window.__omniscienceFilterInjected) return;
	window.__omniscienceFilterInjected = true;

	/* ============== Тема (вшита, править здесь) ============== */
	const THEME = {
		web: 'dark',
		light: { background: '#ffffff', color: '#000000' },
		dark: { background: '#1a1a2e', color: '#e0e0ff' }
	};

	/* ============== Регистрация CSS-свойств (не требует DOM) ============== */
	if (window.CSS && CSS.registerProperty) {
		const props = [
			{ name: '--TheOmniscience-max-r', syntax: '<number>', inherits: true, initialValue: 0 },
			{ name: '--TheOmniscience-max-g', syntax: '<number>', inherits: true, initialValue: 0 },
			{ name: '--TheOmniscience-max-b', syntax: '<number>', inherits: true, initialValue: 0 },
			{ name: '--TheOmniscience-target-alpha', syntax: '<number>', inherits: true, initialValue: 0.25 }
		];
		for (const cfg of props) {
			try { CSS.registerProperty(cfg); } catch (e) {}
		}
	}

	/* ============== Вставка стилей (тема + анимация) при появлении <head> ============== */
	function injectAllStyles() {
		if (!document.head) return false;

		const styleTheme = document.createElement('style');
		styleTheme.textContent = `
			:root { color-scheme: ${THEME.web}; }
			@media (prefers-color-scheme: light) {
				body { background: ${THEME.light.background} !important; color: ${THEME.light.color} !important; }
			}
			@media (prefers-color-scheme: dark) {
				body { background: ${THEME.dark.background} !important; color: ${THEME.dark.color} !important; }
			}
			body, html, main { background: transparent !important; }
		`;
		document.head.appendChild(styleTheme);

		const styleAnimation = document.createElement('style');
		styleAnimation.textContent = `
			:root {
				animation: purple-cycle 4s linear infinite;
			}
			@keyframes purple-cycle {
				0%  { --TheOmniscience-max-r: 128; --TheOmniscience-max-b: 128; }
				25%  { --TheOmniscience-max-r: 128; --TheOmniscience-max-b: 0; }
				50%  { --TheOmniscience-max-r: 128; --TheOmniscience-max-b: 128; }
				75%  { --TheOmniscience-max-r: 0; --TheOmniscience-max-b: 128; }
				100%  { --TheOmniscience-max-r: 128; --TheOmniscience-max-b: 128; }
			}
		`;
		document.head.appendChild(styleAnimation);
		return true;
	}

	// Ждём head
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

	/* ============== Уникальные ID для градиентов ============== */
	let gradIdCounter = 0;
	function getGradId(el) {
		if (!el._TheOmniscienceGradId) el._TheOmniscienceGradId = ++gradIdCounter;
		return el._TheOmniscienceGradId;
	}

	/* ============== Финальное выражение с алгоритмом перераспределения потерь ============== */
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

	/* ============== Обработка элемента ============== */
	const processed = new WeakSet();

	function processElement(el) {
		if (!el || processed.has(el)) return;
		processed.add(el);

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
	}

	function reprocessElement(el) {
		processed.delete(el);
		processElement(el);
	}

	/* ============== Запуск обработки после готовности DOM ============== */
	function startProcessing() {
		document.querySelectorAll('*').forEach(processElement);

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