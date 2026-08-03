export default function(systemInfo) {
    try {
        const gpu = systemInfo?.hardware?.gpu;
        
        if (!gpu || !gpu.renderer) {
            console.warn('GPU information not available');
            return 'unknown';
        }

        const renderer = gpu.renderer.toLowerCase();
        const vendor = gpu.vendor?.toLowerCase() || '';

        console.log('GPU Renderer:', gpu.renderer);
        console.log('GPU Vendor:', gpu.vendor);

        // Ключевые слова для дискретных видеокарт
        const discreteKeywords = [
            'nvidia', 'geforce', 'gtx', 'rtx', 'quadro', 'tesla', 
            'amd', 'radeon', 'rx', 'vega', 'radeon pro', 'radeon rx',
            'intel arc', 'arc a', 'arc',
            // Дополнительные паттерны
            'gpu', 'graphics', 'video card', 'dGPU'
        ];

        // Ключевые слова для интегрированной графики
        const integratedKeywords = [
            'intel', 'hd graphics', 'uhd graphics', 'iris', 'iris pro', 'iris plus',
            'amd radeon', 'vega', 'graphics', 'apu', 
            'microsoft basic render', 'basic display',
            'llvmpipe', 'softpipe', 'software renderer', 'cpu',
            'core i3', 'core i5', 'core i7', 'core i9', 'pentium', 'celeron'
        ];

        // Проверяем WebGL рендерер для дополнительной информации
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        let webglRenderer = '';
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                webglRenderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
            }
        }

        // Объединяем всю информацию для анализа
        const allInfo = (renderer + ' ' + vendor + ' ' + webglRenderer).toLowerCase();

        // Проверяем интегрированную графику в первую очередь (более безопасно)
        const isIntegrated = integratedKeywords.some(keyword => 
            allInfo.includes(keyword.toLowerCase())
        );

        // Проверяем дискретные карты
        const isDiscrete = discreteKeywords.some(keyword => 
            allInfo.includes(keyword.toLowerCase())
        );

        // Эвристика на основе типичных паттернов
        if (allInfo.includes('nvidia') && !allInfo.includes('integrated')) {
            return 'discrete';
        }
        if (allInfo.includes('amd') && !allInfo.includes('integrated') && !allInfo.includes('radeon graphics')) {
            return 'discrete';
        }
        if (allInfo.includes('intel arc')) {
            return 'discrete';
        }

        // Если явно интегрированная
        if (isIntegrated) {
            return 'integrated';
        }

        // Если явно дискретная
        if (isDiscrete) {
            return 'discrete';
        }

        // Дополнительные проверки по WebGL
        if (webglRenderer) {
            if (webglRenderer.includes('nvidia') || webglRenderer.includes('amd') || webglRenderer.includes('radeon')) {
                if (!webglRenderer.includes('integrated') && !webglRenderer.includes('intel')) {
                    return 'discrete';
                }
            }
        }

        // Если ничего не определили, но есть информация о рендерере
        if (renderer && renderer !== 'unknown') {
            // Если рендерер содержит упоминания о GPU, но не интегрированный
            if ((renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon')) &&
                !renderer.includes('integrated') && !renderer.includes('intel')) {
                return 'discrete';
            }
        }

        return 'unknown';
    } catch (error) {
        console.error('Error determining GPU type:', error);
        return 'unknown';
    }
}