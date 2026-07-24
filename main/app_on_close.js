import electronPkg from 'electron';
const{app}=electronPkg;

export default async function() {
	app.on('window-all-closed', () => {
		app.quit();
	});
}