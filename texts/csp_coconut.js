(function () {
    // Удаляем мета-теги CSP, чтобы разрешить eval
    document.addEventListener('DOMContentLoaded', () => {
        const cspMetas = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"], meta[http-equiv="content-security-policy"]');
        cspMetas.forEach(meta => meta.remove());
    });
})();