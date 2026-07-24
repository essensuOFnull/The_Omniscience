// texts_load.js
import { readdir, readFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export default async function () {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);

	// Папка с текстами — на одном уровне с main (родительская директория)
	const textsDir = join(__dirname, '..', 'texts');

	// Сбрасываем объект текстов
	global._ = {};

	let files;
	try {
		files = await readdir(textsDir);
	} catch (err) {
		console.error('[texts_load] Не удалось прочитать папку texts:', err.message);
		return;
	}

	const results = await Promise.allSettled(
		files
			.filter(file => extname(file) !== '' || file.includes('.')) // берем только файлы с расширением (текстовые), папки не имеют точки
			.map(async (file) => {
				const filePath = join(textsDir, file);
				const content = await readFile(filePath, 'utf-8');
				const name = basename(file, extname(file)); // убираем расширение
				global._[name] = content;
			})
	);

	results.forEach((result, index) => {
		if (result.status === 'rejected') {
			const file = files[index];
			console.error(
				`[texts_load] Ошибка загрузки файла "${file}":`,
				result.reason
			);
		}
	});
}