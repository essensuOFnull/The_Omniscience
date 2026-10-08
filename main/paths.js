import path from "path";
import { fileURLToPath, pathToFileURL } from 'url';

export default function () {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const root = path.resolve(__dirname, '..');

    global.paths = {
        projectRoot: root,

        icon: path.join(root, 'icon.ico'),
        config: path.join(root, 'config.json'),

        publicDir: path.join(root, 'public'),
        srcDir: path.join(root, 'src'),
        distDir: path.join(root, 'dist'),

        extensionsDir: path.join(root, 'extensions'),
        webappsDir: path.join(root, 'webapps'),
        componentappsDir: path.join(root, 'componentapps'),

        reactIndex: pathToFileURL(path.join(root, 'dist', 'src', 'index.html')).href,
        topBarIndex: pathToFileURL(path.join(root, 'dist', 'src', 'topbar.html')).href,
        overviewIndex: pathToFileURL(path.join(root, 'dist', 'src', 'overview.html')).href,

        reactPreload: path.join(root, '.temp', 'reactPreload.cjs'),
        extensionsPreload: path.join(root, '.temp', 'extensionsPreload.cjs'),
    };
}