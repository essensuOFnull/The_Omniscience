# Omniscience Launcher

Omniscience is a cross-platform launcher for the project's own applications. It does not replace the operating-system desktop, taskbar, wallpaper, or window manager. Launched apps use normal, decorated native windows.

## Run

Install dependencies and start the background launcher:

```sh
npm install
npm start
```

To open an app directly:

```sh
npm start -- --launch-app webapp calculator
npm start -- --launch-app componentapp settings
```

Supported app types are `webapp`, `componentapp`, and `extension`. The `--quit` argument exits the running launcher. The generated Start Menu/application-menu entry can start it again if it was exited.

## App folders

Place app folders next to the executable (or next to the AppImage on Linux):

```text
Omniscience.exe / Omniscience.AppImage
componentapps/
webapps/
extensions/
```

- A `webapps/<id>/` app needs an `index.html`.
- A `componentapps/<id>/` app needs an `Index.jsx`; it is compiled on first launch.
- An extension is listed only when its manifest defines an action popup. Place unpacked extensions or `.crx` files in `extensions/`.

The launcher creates shortcuts for discovered apps and refreshes its three app categories at startup. Windows shortcuts go in the current user's Start Menu; Linux uses the XDG application menu. A background-start shortcut is also added to the platform's user autostart location.

## Build release archives

Build on the target operating system:

```sh
npm run build:win
npm run build:linux
```

The Windows command creates a portable executable and a ZIP. The Linux command creates an AppImage and a ZIP. Each ZIP contains the launcher and the `componentapps/`, `webapps/`, and `extensions/` folders from the project root. Add the apps you want to distribute to those folders before building. App folders are not embedded in the executable or AppImage.

The AppImage target requires a Linux build environment. The Linux command is not cross-built from Windows.
