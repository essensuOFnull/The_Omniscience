import get_canvas_fingerprint from './get_canvas_fingerprint';
import get_available_fonts from './get_available_fonts';
import get_webgl_fingerprint from './get_webgl_fingerprint';
export default function() {
    let system_info = {
        browser: {
            user_agent: navigator.userAgent,
            name: navigator.appName,
            version: navigator.appVersion,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            cookie_enabled: navigator.cookieEnabled,
            java_enabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
            pdf_enabled: navigator.pdfViewerEnabled || false
        },
        hardware: {
            cpu: {
                cores: navigator.hardwareConcurrency || 'unavailable'
            },
            ram: {
                size: navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'unavailable'
            },
            gpu: {},
            max_touch_points: navigator.maxTouchPoints || 0
        },
        screen: {
            width: screen.width,
            height: screen.height,
            color_depth: screen.colorDepth + ' bit',
            pixel_depth: screen.pixelDepth + ' bit',
            pixel_ratio: window.devicePixelRatio || 1,
            available_width: screen.availWidth,
            available_height: screen.availHeight
        }
    };

    // 🎨 GPU Information
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                system_info.hardware.gpu.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                system_info.hardware.gpu.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }
    } catch (e) {
        system_info.hardware.gpu.error = 'WebGL unavailable';
    }

    // 🌐 Network Information
    if (navigator.connection) {
        const connection = navigator.connection;
        system_info.network = {
            type: connection.effectiveType || 'unknown',
            downlink: connection.downlink + ' Mbps',
            rtt: connection.rtt + ' ms',
            save_data: connection.saveData || false
        };
    }

    // 💾 Storage
    system_info.storage = {};
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
            system_info.storage.used = estimate.usage;
            system_info.storage.quota = estimate.quota;
            system_info.storage.usage_percentage = ((estimate.usage / estimate.quota) * 100).toFixed(2) + '%';
        });
    }

    // 📍 Time & Location
    system_info.time = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezone_offset: new Date().getTimezoneOffset(),
        locale: navigator.language
    };

    // 🔋 Battery
    system_info.battery = {};
    if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
            system_info.battery = {
                level: (battery.level * 100) + '%',
                charging: battery.charging,
                charging_time: battery.chargingTime,
                discharging_time: battery.dischargingTime
            };
        });
    }

    // ⚡ Performance
    system_info.performance = {};
    if (performance) {
        // Memory information
        if (performance.memory) {
            system_info.performance.memory = {
                used_js_heap: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
                total_js_heap: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
                js_heap_size_limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
            };
        }
        
        // Timing information
        if (performance.timing) {
            system_info.performance.timing = {
                dom_content_loaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart + ' ms',
                full_load: performance.timing.loadEventEnd - performance.timing.navigationStart + ' ms',
                dom_interactive: performance.timing.domInteractive - performance.timing.navigationStart + ' ms'
            };
        }
    }

    // 🎧 Audio
    system_info.audio = {};
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        system_info.audio.sample_rate = audioContext.sampleRate;
    } catch (e) {
        system_info.audio.error = 'AudioContext unavailable';
    }

    // 📊 Additional APIs availability
    system_info.available_apis = {
        virtual_reality: !!navigator.getVRDisplays,
        notifications: 'Notification' in window,
        service_worker: 'serviceWorker' in navigator,
        geolocation: 'geolocation' in navigator,
        bluetooth: 'bluetooth' in navigator,
        usb: 'usb' in navigator,
        media_devices: 'mediaDevices' in navigator,
        permissions: 'permissions' in navigator,
        clipboard: 'clipboard' in navigator,
        credentials: 'credentials' in navigator
    };

    // 🔍 Advanced fingerprinting data
    system_info.advanced = {
        canvas_fingerprint: get_canvas_fingerprint(),
        webgl_fingerprint: get_webgl_fingerprint(),
        fonts: get_available_fonts()
    };
	return system_info;
}