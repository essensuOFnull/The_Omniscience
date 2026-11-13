import electronPkg from 'electron';
import path from "path";
import { fileURLToPath } from 'url';

export default function () {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const appRoot = path.resolve(__dirname, '..');
    const distributionRoot = process.env.APPIMAGE
        ? path.dirname(process.env.APPIMAGE)
        : process.env.PORTABLE_EXECUTABLE_DIR
            || (electronPkg.app.isPackaged
                ? path.dirname(electronPkg.app.getPath('exe'))
                : appRoot);
    const userData = electronPkg.app.getPath('userData');

    global.paths = {
        projectRoot: appRoot,
        distributionRoot,
        userData,

        icon: path.join(appRoot, 'icon.ico'),
        config: path.join(appRoot, 'config.json'),

        publicDir: path.join(appRoot, 'public'),
        distDir: path.join(userData, 'dist'),

        extensionsDir: path.join(distributionRoot, 'extensions'),
        webappsDir: path.join(distributionRoot, 'webapps'),
        componentappsDir: path.join(distributionRoot, 'componentapps'),

        reactPreload: path.join(userData, 'preloads', 'reactPreload.cjs'),
    };

    global.paths.appRoot = appRoot;
}