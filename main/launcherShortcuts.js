import electronPkg from 'electron';
import { createHash } from 'crypto';
import { mkdir, readdir, unlink, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { getLaunchAppArgs, quoteDesktopExecArg } from './launcherCommands.js';

const { app, shell } = electronPkg;

const APP_CATEGORIES = [
  { type: 'webapp', folder: 'Omniscience webapps', title: 'Omniscience webapps' },
  { type: 'componentapp', folder: 'Omniscience componentapps', title: 'Omniscience componentapps' },
  { type: 'extension', folder: 'Omniscience extensions', title: 'Omniscience extensions' },
];

function stableName(appType, appId) {
  const slug = String(appId)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'app';
  const hash = createHash('sha256').update(`${appType}:${appId}`).digest('hex').slice(0, 10);
  return `${slug}`;
}

function quoteWindowsArgument(value) {
  const text = String(value);
  return `"${text.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`;
}

function buildDesktopEntry({ name, executable, args, workingDirectory, noDisplay = false }) {
  const lines = [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${String(name).replace(/[\r\n]/g, ' ')}`,
    `Exec=${[executable, ...args].map(quoteDesktopExecArg).join(' ')}`,
    `Path=${workingDirectory}`,
    'Terminal=false',
    'StartupNotify=false',
  ];
  if (noDisplay) lines.push('NoDisplay=true', 'X-GNOME-Autostart-enabled=true');
  return `${lines.join('\n')}\n`;
}

async function removeGeneratedFiles(directory, prefix, extension) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  await Promise.all(entries
    .filter((entry) => entry.isFile()
      && entry.name.startsWith(prefix)
      && entry.name.endsWith(extension))
    .map((entry) => unlink(path.join(directory, entry.name))));
}

async function writeWindowsShortcut(shortcutPath, executable, args, workingDirectory) {
  const written = shell.writeShortcutLink(shortcutPath, 'create', {
    target: executable,
    args: args.map(quoteWindowsArgument).join(' '),
    cwd: workingDirectory,
    description: 'Omniscience app launcher',
  });
  if (!written) throw new Error(`Could not create shortcut: ${shortcutPath}`);
}

async function syncWindowsShortcuts(apps, executable, workingDirectory, targetArgs) {
  const programs = path.join(
    app.getPath('appData'),
    'Microsoft', 'Windows', 'Start Menu', 'Programs',
  );
  const launcherPath = path.join(programs, 'Omniscience.lnk');
  await mkdir(programs, { recursive: true });
  await writeWindowsShortcut(launcherPath, executable, targetArgs(['--background']), workingDirectory);

  const quitPath = path.join(programs, 'Omniscience - Exit.lnk');
  await writeWindowsShortcut(quitPath, executable, targetArgs(['--quit']), workingDirectory);

  for (const category of APP_CATEGORIES) {
    const directory = path.join(programs, category.folder);
    await mkdir(directory, { recursive: true });
    await removeGeneratedFiles(directory, 'omniscience-', '.lnk');
    for (const item of apps.filter((candidate) => candidate.type === category.type)) {
      const fileName = `${stableName(item.type, item.id)}.lnk`;
      await writeWindowsShortcut(
        path.join(directory, fileName),
        executable,
        item.shortcutArgs,
        workingDirectory,
      );
    }
  }

  const startupDirectory = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  await mkdir(startupDirectory, { recursive: true });
  await writeWindowsShortcut(
    path.join(startupDirectory, 'Omniscience.lnk'),
    executable,
    targetArgs(['--background']),
    workingDirectory,
  );
}

function buildLinuxMenuFile(apps) {
  const menus = APP_CATEGORIES.map((category) => {
    const files = apps
      .filter((item) => item.type === category.type)
      .map((item) => `<Filename>${stableName(item.type, item.id)}.desktop</Filename>`)
      .join('');
    return `<Menu><Name>${category.title}</Name><Directory>${category.title}.directory</Directory><Include>${files}</Include></Menu>`;
  }).join('');
  return `<!DOCTYPE Menu PUBLIC "-//freedesktop//DTD Menu 1.0//EN" "http://www.freedesktop.org/standards/menu-spec/1.0/menu.dtd">\n<Menu><Name>Applications</Name><MergeFile type="parent"/><Menu><Name>Omniscience</Name><Directory>Omniscience.directory</Directory><Include><Filename>Omniscience.desktop</Filename><Filename>Omniscience-Exit.desktop</Filename></Include>${menus}</Menu></Menu>\n`;
}

async function syncLinuxShortcuts(apps, executable, workingDirectory, targetArgs) {
  const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  const applications = path.join(dataHome, 'applications');
  const menuDirectory = path.join(configHome, 'menus', 'applications-merged');
  const autostartDirectory = path.join(configHome, 'autostart');
  await Promise.all([
    mkdir(applications, { recursive: true }),
    mkdir(menuDirectory, { recursive: true }),
    mkdir(autostartDirectory, { recursive: true }),
  ]);

  const addDirectories = [
    { id: 'Omniscience', name: 'Omniscience' },
    ...APP_CATEGORIES.map((category) => ({ id: category.title, name: category.title })),
  ];
  await Promise.all(addDirectories.map(({ id, name }) => writeFile(
    path.join(applications, `${id}.directory`),
    `[Desktop Entry]\nType=Directory\nName=${name}\n`,
  )));

  await removeGeneratedFiles(applications, 'omniscience-', '.desktop');
  for (const item of apps) {
    const fileName = `${stableName(item.type, item.id)}.desktop`;
    await writeFile(path.join(applications, fileName), buildDesktopEntry({
      name: item.title,
      executable,
      args: item.shortcutArgs,
      workingDirectory,
    }));
  }

  await writeFile(path.join(applications, 'Omniscience.desktop'), buildDesktopEntry({
    name: 'Omniscience Background',
    executable,
    args: targetArgs(['--background']),
    workingDirectory,
  }));
  await writeFile(path.join(applications, 'Omniscience-Exit.desktop'), buildDesktopEntry({
    name: 'Exit Omniscience',
    executable,
    args: targetArgs(['--quit']),
    workingDirectory,
  }));
  await writeFile(path.join(menuDirectory, 'omniscience.menu'), buildLinuxMenuFile(apps));
  await writeFile(path.join(autostartDirectory, 'omniscience.desktop'), buildDesktopEntry({
    name: 'Omniscience Background',
    executable,
    args: targetArgs(['--background']),
    workingDirectory,
    noDisplay: true,
  }));
}

export async function syncLauncherShortcuts(apps, distributionRoot) {
  const executable = process.env.APPIMAGE
    || process.env.PORTABLE_EXECUTABLE
    || app.getPath('exe');
  const launchArgs = app.isPackaged ? [] : [app.getAppPath()];
  const targetArgs = (args) => [...launchArgs, ...args];
  if (process.platform === 'win32') {
    const shortcuts = apps.map((item) => ({
      ...item,
      shortcutArgs: targetArgs(getLaunchAppArgs(item.type, item.id)),
    }));
    await syncWindowsShortcuts(shortcuts, executable, distributionRoot, targetArgs);
    return;
  }
  if (process.platform === 'linux') {
    const shortcuts = apps.map((item) => ({
      ...item,
      shortcutArgs: targetArgs(getLaunchAppArgs(item.type, item.id)),
    }));
    await syncLinuxShortcuts(shortcuts, executable, distributionRoot, targetArgs);
    return;
  }
  throw new Error(`Launcher shortcuts are not supported on ${process.platform}`);
}
