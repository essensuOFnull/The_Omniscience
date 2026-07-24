import electronPkg from 'electron';
const{ipcMain}=electronPkg;

export default function () {
	ipcMain.handle('get-config', () => {
		// Возвращаем клон конфига; при необходимости здесь можно удалить чувствительные поля
		return {
			...global.config,
			xtermPreload:global.paths.xtermPreload
		};
	});
}
