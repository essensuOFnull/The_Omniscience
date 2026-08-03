import determine_GPU_type from './determine_GPU_type';
export default function(systemInfo) {
    try {
        const gpuType = determine_GPU_type(systemInfo);
        
        console.log('Detected GPU type:', gpuType);
        
        // Тестируем производительность WebGL
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            return {
                method: 'cpu',
                reason: 'WebGL не поддерживается - используем программный рендеринг',
                confidence: 'high'
            };
        }

        // Проверяем возможности WebGL
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        console.log('Max texture size:', maxTextureSize);

        switch (gpuType) {
            case 'discrete':
                return {
                    method: 'gpu',
                    reason: 'Обнаружена дискретная видеокарта - используем аппаратное ускорение',
                    confidence: 'high'
                };
                
            case 'integrated':
                // Для интегрированной графики проверяем производительность
                if (maxTextureSize >= 4096) {
                    return {
                        method: 'gpu', 
                        reason: 'Интегрированная графика с хорошей поддержкой WebGL - используем аппаратное ускорение',
                        confidence: 'medium'
                    };
                } else {
                    return {
                        method: 'cpu',
                        reason: 'Интегрированная графика с ограниченными возможностями - используем программный рендеринг',
                        confidence: 'medium'
                    };
                }
                
            case 'unknown':
            default:
                // Для неизвестных GPU тестируем производительность
                if (maxTextureSize >= 2048) {
                    return {
                        method: 'gpu',
                        reason: 'Неизвестный GPU с хорошими характеристиками - пробуем аппаратное ускорение',
                        confidence: 'low'
                    };
                } else {
                    return {
                        method: 'cpu',
                        reason: 'Неизвестный GPU с ограниченными возможностями - используем безопасный режим (CPU)',
                        confidence: 'medium'
                    };
                }
        }
    } catch (error) {
        console.error('Error determining rendering method:', error);
        return {
            method: 'cpu',
            reason: 'Ошибка определения метода рендеринга - используем безопасный режим',
            confidence: 'high'
        };
    }
}