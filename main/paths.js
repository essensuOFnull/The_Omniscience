import path from "path";
import { fileURLToPath } from 'url';

export default function () {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Корень проекта = на одну папку вверх от main/
    const root = path.resolve(__dirname, '..');

    global.paths = {
        projectRoot: root,
        icon: path.join(root, 'icon.ico'),
        config: path.join(root, 'config.json'),
        publicDir: path.join(root, 'public'),
        srcDir: path.join(root, 'src'),
        distDir: path.join(root,'dist'),
        desktopIndex: path.join(root,'dist','src','index.html'),
        xtermIndex: path.join(root,'xterm.html'),
        extensionsDir: path.join(root, 'extensions'),
        webappsDir: path.join(root, 'webapps'),
        componentappsDir: path.join(root, 'componentapps'),
        backgroundHTML: path.join(root, 'background.html'),
        tabBarHTML: path.join(root, 'tabBar.html'),
	xtermPreload:path.join(root, '.temp','xtermPreload.js'),
    };
}
