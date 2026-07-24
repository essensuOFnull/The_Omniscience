import electronPkg from 'electron';
const{session}=electronPkg;
import path from 'path';
import packageJson from '../package.json' with { type: "json" };

export default async function(){
	// Достаем имя проекта и версию напрямую из конфига
	const appName = packageJson.name;
	const appVersion = packageJson.version;
	// 2. Берем дефолтный User-Agent всей сессии
	const defaultUA = session.defaultSession.getUserAgent();
	// 3. Склеиваем в красивую строку
	const customUA = `${defaultUA} ${appName}/${appVersion}`;
	// 3.1 передумываем, и ставим стандартный UserAgent)))
	//const customUA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
	// 4. Задаем новый User-Agent глобально на всю сессию
	session.defaultSession.setUserAgent(customUA);

	console.log(`[System] Установлен глобальный User-Agent: ${customUA}`);
}
