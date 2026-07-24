import electronPkg from 'electron';
const{app}=electronPkg;

export default async function () {
	app.on('will-quit', () => {
		/*session.defaultSession.clearCache();*/
		global.gc();
		global.$.log('Приложение полностью выключено');
		process.exit(0);
	});
}