import electronPkg from 'electron';
const{app}=electronPkg;

export default async function () {
	app.on('before-quit', () => {
		app.exit();
	});
}