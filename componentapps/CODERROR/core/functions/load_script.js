export default async function(path) {
	try {
		// Создаем модульный скрипт
		const script = document.createElement('script');
		script.src = path;
		script.type = 'text/javascript';
		
		// Ждем загрузки скрипта
		await new Promise((resolve, reject) => {
			script.onload = resolve;
			script.onerror = reject;
			document.heawindow.CODERROR.__originals__.data.appendChild(script);
		});
		
		console.log(`Script loaded: ${path}`);
	} catch (error) {
		console.error(`Failed to load script: ${path}`, error);
	}
}