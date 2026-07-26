import path from "path";
import { fileURLToPath,pathToFileURL } from 'url';

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

        extensionsDir: path.join(root, 'extensions'),
        webappsDir: path.join(root, 'webapps'),
        componentappsDir: path.join(root, 'componentapps'),

        reactIndex: pathToFileURL(path.join(root,'dist','src','index.html')).href,
        /*важно передавать просто абсолютный путь, а не по протоколу file*/
        reactPreload:path.join(root, '.temp','reactPreload.js'),
        webtabPreload:path.join(root, '.temp','webtabPreload.js'),
    };
}
