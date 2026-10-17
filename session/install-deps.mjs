#!/usr/bin/env node
// session/install-deps.mjs
//
// Единая точка установки всех системных зависимостей The Omniscience.
//
// Заменяет bash-версию install-deps.sh. Логика — та же, но на JS:
//   - список пакетов задаётся массивами,
//   - пакетный менеджер вызывается по имени дистрибутива,
//   - каждый пакет/группа ставится отдельной командой, чтобы провал
//     одной группы не рушил остальные.
//
// Запуск:  node session/install-deps.mjs
// Флаги:   --build-only     только build-зависимости
//          --runtime-only   только runtime
//          --skip-diagnostics  не запускать финальную проверку

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// ─── Определение дистрибутива ───────────────────────────────────────────

function detectDistro() {
    if (!existsSync('/etc/os-release')) return null;
    const txt = readFileSync('/etc/os-release', 'utf8');
    const m = txt.match(/^ID="?([^"\n]+)"?/m);
    return m ? m[1].trim() : null;
}

const DISTRO = detectDistro();
if (!DISTRO) {
    console.error('⚠️  Не удалось определить дистрибутив (/etc/os-release).');
    process.exit(1);
}
console.log(`🔍 Обнаружен дистрибутив: ${DISTRO}`);

// ─── Флаги ──────────────────────────────────────────────────────────────

const ARGS = new Set(process.argv.slice(2));
const BUILD_ONLY      = ARGS.has('--build-only');
const RUNTIME_ONLY    = ARGS.has('--runtime-only');
const SKIP_DIAGNOSTICS = ARGS.has('--skip-diagnostics');

// ─── Списки пакетов ─────────────────────────────────────────────────────
//
// Каждый дистрибутив имеет свой набор имён. Здесь собраны:
//   build   — для node-pty / electron-rebuild / gtk-bridge
//   core    — WM, Xorg, D-Bus, keyring, polkit, session basics
//   kde     — KDE-сервисы (kded6, kglobalacceld, krunner)
//   audio   — PipeWire полный стек + EasyEffects
//   input   — IME, libinput, специальные возможности
//   display — яркость, ночной режим, ICC, автоповорот
//   peripherals — принтеры, сканеры, планшеты
//   theme   — Qt/GTK темы, шрифты
//   extras  — скриншоты, TTS, автомонтирование, XDG autostart
//
// Если что-то из перечисленного не найдётся в репозиториях —
// соответствующая группа просто пропустится, остальное встанет.

const PACKAGES = {
    // ─── Debian / Ubuntu и производные ───
    debian: {
        build: [
            'build-essential', 'python3', 'python3-dev', 'python3-setuptools',
            'make', 'g++', 'pkg-config', 'libnode-dev',
        ],
        core: [
            'kwin-x11',
            'dbus', 'dbus-user-session', 'dbus-bin',
            'fuse3',
            'x11-xserver-utils', 'x11-xkb-utils', 'x11-utils',
            'xdotool', 'wmctrl',
            'gnome-keyring',
            'policykit-1',
        ],
        kde: [
            'kglobalacceld', 'kded6', 'krunner',
            'plasma-workspace',   // даёт kaccess, klipper, krunner и др.
            'kio', 'kio-extras',
        ],
        audio: [
            'pipewire', 'pipewire-pulse', 'pipewire-jack', 'pipewire-alsa',
            'wireplumber', 'libspa-0.2-bluetooth',
            'easyeffects', 'lsp-plugins-lv2', 'lsp-plugins-vst',
        ],
        input: [
            'fcitx5', 'fcitx5-frontend-gtk3', 'fcitx5-frontend-gtk4',
            'fcitx5-frontend-qt6',
            'libinput-tools', 'xinput',
            'kaccess',
        ],
        display: [
            'brightnessctl', 'gammastep', 'colord', 'xiccd', 'iio-sensor-proxy',
        ],
        peripherals: [
            'cups', 'system-config-printer',
            'sane', 'sane-utils', 'simple-scan',
            'xserver-xorg-input-wacom',
        ],
        theme: [
            'qt6ct', 'qt5ct',
            'fonts-dejavu-core',
        ],
        extras: [
            'spectacle',
            'speech-dispatcher', 'espeak-ng',
            'udisks2',
            'dex',
            'network-manager',
            'bluez', 'bluez-tools',
            'curl', 'git',
        ],
        optional: [
            'lxpolkit',              // polkit agent, легковесный
            'xterm', 'xfonts-terminus',
        ],
    },

    // ─── Arch / Manjaro / EndeavourOS / Garuda ───
    arch: {
        build: [
            'base-devel', 'python', 'python-setuptools',
            'nodejs', 'npm',
        ],
        core: [
            'kwin-x11',
            'dbus',
            'fuse3',
            'xorg-xrandr', 'xorg-xset', 'xorg-setxkbmap',
            'xorg-xprop', 'xorg-xdpyinfo',
            'xdotool', 'wmctrl',
            'gnome-keyring',
            'polkit',
        ],
        kde: [
            'kglobalacceld', 'kded', 'krunner',
            'plasma-workspace',
            'kio', 'kio-extras',
        ],
        audio: [
            'pipewire', 'pipewire-pulse', 'pipewire-jack', 'pipewire-alsa',
            'wireplumber',
            'easyeffects', 'lsp-plugins', 'calf',
        ],
        input: [
            'fcitx5', 'fcitx5-gtk', 'fcitx5-qt',
            'libinput', 'xorg-xinput',
        ],
        display: [
            'brightnessctl', 'gammastep', 'colord', 'xiccd', 'iio-sensor-proxy',
        ],
        peripherals: [
            'cups', 'system-config-printer',
            'sane', 'simple-scan',
            'xf86-input-wacom',
        ],
        theme: [
            'qt6ct', 'qt5ct',
            'ttf-dejavu',
        ],
        extras: [
            'spectacle',
            'speech-dispatcher', 'espeak-ng',
            'udisks2',
            'dex',
            'networkmanager',
            'bluez', 'bluez-utils',
            'curl', 'git',
        ],
        optional: [
            'lxqt-policykit',        // polkit agent
            'terminus-font',
            'xterm',
        ],
        // Специальные: AUR-пакеты. Ставятся отдельным шагом через
        // pamac/yay/paru, если найдётся хоть один из них.
        aur: [

        ],
    },

    // ─── Fedora / RHEL / CentOS ───
    fedora: {
        build: [
            'make', 'automake', 'gcc', 'gcc-c++', 'kernel-devel',
            'python3', 'python3-devel', 'python3-setuptools',
        ],
        core: [
            'kwin-x11',
            'dbus', 'dbus-tools', 'dbus-x11',
            'fuse3',
            'xorg-x11-server-utils', 'xorg-x11-utils',
            'xdotool', 'wmctrl',
            'gnome-keyring',
            'polkit',
        ],
        kde: [
            'kglobalacceld', 'kf6-kded', 'krunner',
            'plasma-workspace',
            'kf6-kio', 'kf6-kio-extras',
        ],
        audio: [
            'pipewire', 'pipewire-pulseaudio', 'pipewire-jack-audio-connection-kit',
            'pipewire-alsa', 'wireplumber',
            'easyeffects', 'lsp-plugins',
        ],
        input: [
            'fcitx5', 'fcitx5-gtk', 'fcitx5-qt',
            'libinput-utils', 'xinput',
        ],
        display: [
            'brightnessctl', 'gammastep', 'colord', 'xiccd', 'iio-sensor-proxy',
        ],
        peripherals: [
            'cups', 'system-config-printer',
            'sane-backends', 'simple-scan',
            'xorg-x11-drv-wacom',
        ],
        theme: [
            'qt6ct', 'qt5ct',
            'dejavu-sans-fonts',
        ],
        extras: [
            'spectacle',
            'speech-dispatcher', 'espeak-ng',
            'udisks2',
            'dex',
            'NetworkManager',
            'bluez', 'bluez-tools',
            'curl', 'git',
        ],
        optional: [
            'lxpolkit',
            'xterm', 'xorg-x11-fonts-terminus',
        ],
    },

    // ─── openSUSE ───
    opensuse: {
        build: [
            'gcc', 'gcc-c++', 'make', 'kernel-devel',
            'python3', 'python3-devel', 'python3-setuptools',
        ],
        core: [
            'kwin6-x11',
            'dbus-1', 'dbus-1-tools', 'dbus-1-x11',
            'fuse3',
            'xrandr', 'xdotool', 'wmctrl',
            'gnome-keyring',
            'polkit',
        ],
        kde: [
            'kglobalacceld6', 'kded6', 'krunner6',
            'plasma6-workspace',
            'kio6', 'kio-extras6',
        ],
        audio: [
            'pipewire', 'pipewire-pulseaudio', 'pipewire-jack', 'pipewire-alsa',
            'wireplumber',
            'easyeffects', 'lsp-plugins',
        ],
        input: [
            'fcitx5', 'fcitx5-gtk', 'fcitx5-qt',
            'libinput-tools',
        ],
        display: [
            'brightnessctl', 'gammastep', 'colord', 'xiccd', 'iio-sensor-proxy',
        ],
        peripherals: [
            'cups', 'system-config-printer',
            'sane-backends', 'simple-scan',
            'xf86-input-wacom',
        ],
        theme: [
            'qt6ct', 'qt5ct',
            'dejavu-fonts',
        ],
        extras: [
            'spectacle',
            'speech-dispatcher', 'espeak-ng',
            'udisks2',
            'dex',
            'NetworkManager',
            'bluez', 'bluez-tools',
            'curl', 'git',
        ],
        optional: [
            'lxpolkit',
            'xterm', 'terminus-bitmap-fonts',
        ],
    },

    // ─── Void ───
    void: {
        build: [
            'base-devel', 'python3', 'python3-setuptools',
        ],
        core: [
            'kwin',
            'dbus',
            'fuse3',
            'xrandr', 'setxkbmap', 'xprop', 'xdpyinfo',
            'xdotool', 'wmctrl',
            'gnome-keyring',
            'polkit',
        ],
        kde: [
            'kglobalacceld', 'kded', 'krunner',
            'plasma-workspace',
            'kio', 'kio-extras',
        ],
        audio: [
            'pipewire', 'pipewire-pulse', 'libjack-pipewire',
            'wireplumber',
            'easyeffects', 'lsp-plugins',
        ],
        input: [
            'fcitx5', 'fcitx5-gtk', 'fcitx5-qt',
            'libinput', 'xinput',
        ],
        display: [
            'brightnessctl', 'gammastep', 'colord', 'xiccd', 'iio-sensor-proxy',
        ],
        peripherals: [
            'cups', 'system-config-printer',
            'sane', 'simple-scan',
            'xf86-input-wacom',
        ],
        theme: [
            'qt6ct', 'qt5ct',
            'dejavu-fonts-ttf',
        ],
        extras: [
            'spectacle',
            'speech-dispatcher', 'espeak-ng',
            'udisks2',
            'dex',
            'NetworkManager',
            'bluez', 'bluez-tools',
            'curl', 'git',
        ],
        optional: [
            'lxpolkit',
            'xterm', 'terminus-font',
        ],
    },

    // ─── Alpine ───
    alpine: {
        build: [
            'build-base', 'python3', 'python3-dev', 'py3-setuptools',
        ],
        core: [
            'kwin',
            'dbus', 'dbus-x11',
            'fuse3',
            'xrandr', 'setxkbmap', 'xprop', 'xdpyinfo',
            'xdotool', 'wmctrl',
            'gnome-keyring',
            'polkit',
        ],
        kde: [
            'kglobalacceld', 'kded', 'krunner',
            'plasma-workspace',
            'kio', 'kio-extras',
        ],
        audio: [
            'pipewire', 'pipewire-pulse', 'pipewire-jack',
            'wireplumber',
            'easyeffects', 'lsp-plugins',
        ],
        input: [
            'fcitx5', 'fcitx5-gtk', 'fcitx5-qt',
            'libinput', 'xinput',
        ],
        display: [
            'brightnessctl', 'gammastep', 'colord', 'xiccd', 'iio-sensor-proxy',
        ],
        peripherals: [
            'cups', 'system-config-printer',
            'sane', 'simple-scan',
            'xf86-input-wacom',
        ],
        theme: [
            'qt6ct', 'qt5ct',
            'ttf-dejavu',
        ],
        extras: [
            'spectacle',
            'speech-dispatcher', 'espeak-ng',
            'udisks2',
            'dex',
            'networkmanager',
            'bluez', 'bluez-utils',
            'curl', 'git',
        ],
        optional: [
            'lxpolkit',
            'xterm', 'terminus-font',
        ],
    },

    // ─── Gentoo ───
    // В Gentoo пакеты — category/name, и USE-флаги настраиваются отдельно.
    // Здесь — базовый набор, USE-флаги придётся проверить руками.
    gentoo: {
        build: [
            'sys-devel/gcc', 'sys-devel/make',
            'dev-lang/python', 'dev-python/setuptools',
        ],
        core: [
            'kde-plasma/kwin-x11',
            'sys-apps/dbus',
            'sys-fs/fuse',
            'x11-apps/xrandr', 'x11-misc/setxkbmap',
            'x11-apps/xprop', 'x11-apps/xdpyinfo',
            'x11-misc/xdotool', 'x11-misc/wmctrl',
            'gnome-base/gnome-keyring',
            'sys-auth/polkit',
        ],
        kde: [
            'kde-plasma/kglobalacceld', 'kde-frameworks/kded',
            'kde-plasma/krunner', 'kde-plasma/plasma-workspace',
            'kde-frameworks/kio', 'kde-apps/kio-extras',
        ],
        audio: [
            'media-video/pipewire', 'media-sound/wireplumber',
            'media-sound/easyeffects', 'media-plugins/lsp-plugins',
        ],
        input: [
            'app-i18n/fcitx', 'app-i18n/fcitx-gtk', 'app-i18n/fcitx-qt',
            'x11-drivers/xf86-input-libinput',
        ],
        display: [
            'app-misc/brightnessctl', 'x11-misc/gammastep',
            'x11-misc/colord', 'x11-misc/xiccd', 'sys-power/iio-sensor-proxy',
        ],
        peripherals: [
            'net-print/cups', 'net-print/system-config-printer',
            'media-gfx/sane-backends', 'media-gfx/simple-scan',
            'x11-drivers/xf86-input-wacom',
        ],
        theme: [
            'x11-themes/qt6ct', 'x11-themes/qt5ct',
            'media-fonts/dejavu',
        ],
        extras: [
            'kde-apps/spectacle',
            'app-accessibility/speech-dispatcher', 'app-accessibility/espeak-ng',
            'sys-fs/udisks',
            'x11-misc/dex',
            'net-misc/networkmanager',
            'net-wireless/bluez',
            'net-misc/curl', 'dev-vcs/git',
        ],
        optional: [
            'lxde-base/lxpolkit',
            'x11-terms/xterm', 'media-fonts/terminus-font',
        ],
    },
};

// ─── Псевдонимы: варианты ID из /etc/os-release → ключ в PACKAGES ────────

const DISTRO_ALIASES = {
    ubuntu: 'debian', linuxmint: 'debian', pop: 'debian',
    parrot: 'debian', kali: 'debian', elementary: 'debian',
    manjaro: 'arch', endeavouros: 'arch', garuda: 'arch', arcolinux: 'arch',
    'rhel': 'fedora', centos: 'fedora', rocky: 'fedora', almalinux: 'fedora',
    opensuse: 'opensuse', 'opensuse-leap': 'opensuse', 'opensuse-tumbleweed': 'opensuse',
    sles: 'opensuse',
    void: 'void',
    alpine: 'alpine',
    gentoo: 'gentoo',
};

const DISTRO_KEY = PACKAGES[DISTRO] ? DISTRO : DISTRO_ALIASES[DISTRO];
if (!DISTRO_KEY || !PACKAGES[DISTRO_KEY]) {
    console.error(`⚠️  Неизвестный дистрибутив: ${DISTRO}`);
    console.error('   Установите зависимости вручную (см. комментарии в файле).');
    process.exit(0);
}

const SPEC = PACKAGES[DISTRO_KEY];

// ─── Пакетные менеджеры ─────────────────────────────────────────────────
//
// Каждая запись — функция, принимающая массив имён пакетов и
// возвращающая [command, args]. Возвращает null, если менеджер не найден.

const MANAGERS = {
    debian: {
        install(pkgs) {
            spawnSync('sudo', ['apt', 'update'], { stdio: 'inherit' });
            return ['sudo', ['apt', 'install', '-y', ...pkgs]];
        },
    },
    arch: {
        install(pkgs) {
            // ВНИМАНИЕ: --noconfirm у pacman не используем (см. практику).
            return ['sudo', ['pacman', '-S', '--needed', ...pkgs]];
        },
        aur: {
            // Пробуем разные AUR-хелперы.
            installOne(pkg) {
                for (const helper of ['pamac', 'yay', 'paru']) {
                    const r = spawnSync('which', [helper], { stdio: 'ignore' });
                    if (r.status === 0) {
                        const args = helper === 'pamac'
                            ? ['build', '--no-confirm', pkg]
                            : ['-S', '--noconfirm', pkg];
                        return [helper, args];
                    }
                }
                return null;
            },
        },
    },
    fedora: {
        install(pkgs) {
            return ['sudo', ['dnf', 'install', '-y', ...pkgs]];
        },
    },
    opensuse: {
        install(pkgs) {
            return ['sudo', ['zypper', 'install', '-y', ...pkgs]];
        },
    },
    void: {
        install(pkgs) {
            return ['sudo', ['xbps-install', '-y', ...pkgs]];
        },
    },
    alpine: {
        install(pkgs) {
            return ['sudo', ['apk', 'add', '--no-interactive', ...pkgs]];
        },
    },
    gentoo: {
        install(pkgs) {
            return ['sudo', ['emerge', ...pkgs]];
        },
    },
};

const MANAGER = MANAGERS[DISTRO_KEY];
if (!MANAGER) {
    console.error(`⚠️  Нет менеджера пакетов для ${DISTRO_KEY}.`);
    process.exit(1);
}

// ─── Утилиты для вывода ─────────────────────────────────────────────────

const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    green: '\x1b[32m',
};
const log  = s => console.log(`${C.cyan}[install]${C.reset} ${s}`);
const warn = s => console.error(`${C.yellow}[warn]${C.reset} ${s}`);
const fail = s => console.error(`${C.red}[fail]${C.reset} ${s}`);
const ok   = s => console.log(`${C.green}✓${C.reset} ${s}`);

// ─── Установка одной группы ─────────────────────────────────────────────

function installGroup(label, packages) {
    if (!packages?.length) return true;
    log(`установка: ${label} (${packages.length} пакетов)`);
    const [cmd, args] = MANAGER.install(packages);
    const r = spawnSync(cmd, args, { stdio: 'inherit' });
    if (r.status !== 0) {
        warn(`группа "${label}" завершилась с кодом ${r.status}`);
        warn(`продолжаем — остальные группы всё равно будут установлены`);
        return false;
    }
    ok(`${label}`);
    return true;
}

// ─── Установка build-зависимостей ───────────────────────────────────────

if (!RUNTIME_ONLY) {
    log('📥 [build] компилятор и python для node-pty / electron-rebuild');
    installGroup('build', SPEC.build);
}

// ─── Установка runtime-зависимостей ─────────────────────────────────────

if (!BUILD_ONLY) {
    log('📥 [runtime] системные пакеты DE');

    const groups = ['core', 'kde', 'audio', 'input', 'display',
                    'peripherals', 'theme', 'extras'];
    for (const name of groups) {
        installGroup(name, SPEC[name]);
    }

    // optional — ставим каждый отдельно, чтобы провал одного не рушил группу
    if (SPEC.optional?.length) {
        log(`📥 [optional] необязательные пакеты (${SPEC.optional.length} шт.)`);
        for (const pkg of SPEC.optional) {
            const r = spawnSync(MANAGER.install([pkg])[0],
                                MANAGER.install([pkg])[1],
                                { stdio: 'ignore' });
            if (r.status === 0) {
                ok(`optional: ${pkg}`);
            } else {
                warn(`optional: ${pkg} не найден, пропускаем`);
            }
        }
    }

    // AUR — только для Arch/Manjaro
    if (MANAGER.aur && SPEC.aur?.length) {
        log('📥 [aur] пакеты из AUR');
        for (const pkg of SPEC.aur) {
            const cmd = MANAGER.aur.installOne(pkg);
            if (!cmd) {
                warn(`AUR-хелпер не найден. Установите ${pkg} вручную:`);
                warn(`  pamac build ${pkg}   # или yay -S ${pkg}`);
                continue;
            }
            log(`  устанавливаем ${pkg} через ${cmd[0]}`);
            const r = spawnSync(cmd[0], cmd[1], { stdio: 'inherit' });
            if (r.status !== 0) warn(`  ${pkg} не установился — пропускаем`);
            else ok(`aur: ${pkg}`);
        }
    }
}

// ─── Диагностика ────────────────────────────────────────────────────────

if (SKIP_DIAGNOSTICS) {
    log('диагностика пропущена (--skip-diagnostics)');
    process.exit(0);
}

console.log('');
log('🔎 проверка ключевых бинарников');

const REQUIRED = [
    // ядро сессии
    'kwin_x11', 'kglobalacceld', 'kded6', 'krunner',
    // X11
    'xrandr', 'setxkbmap', 'xprop', 'xdpyinfo', 'xdotool', 'wmctrl',
    // dbus / polkit / keyring
    'dbus-run-session', 'gnome-keyring-daemon',
    // audio
    'pipewire', 'wireplumber', 'pipewire-pulse', 'easyeffects',
    // input
    'fcitx5',
    // display
    'brightnessctl', 'gammastep',
    // theme
    'qt6ct',
    // misc
    'udisksctl', 'dex',
];

const OPTIONAL_BINS = [
    'lxpolkit', 'lxqt-policykit', 'spectacle',
    'system-config-printer', 'simple-scan',
    'espeak-ng', 'nmcli', 'bluetoothctl',
    'fusermount3',
    'setpriv', 'getcap',
];

function findBin(name) {
    const r = spawnSync('which', [name], { encoding: 'utf8' });
    return r.status === 0 ? (r.stdout ?? '').trim() : null;
}

// polkit agents в нестандартных местах
for (const alt of [
    '/usr/lib/polkit-kde-authentication-agent-1',
    '/usr/libexec/polkit-kde-authentication-agent-1',
    '/usr/lib/x86_64-linux-gnu/libexec/polkit-kde-authentication-agent-1',
]) {
    if (existsSync(alt)) {
        REQUIRED.push(alt);
        break;
    }
}

let missingRequired = 0;
for (const bin of REQUIRED) {
    const path = bin.startsWith('/') ? (existsSync(bin) ? bin : null) : findBin(bin);
    if (path) {
        console.log(`  ${C.green}✓${C.reset} ${bin.padEnd(34)} ${path}`);
    } else {
        console.log(`  ${C.red}✗${C.reset} ${bin.padEnd(34)} ${C.red}не найден${C.reset}`);
        missingRequired++;
    }
}

console.log('');
log('🔎 необязательные (используются по необходимости)');
for (const bin of OPTIONAL_BINS) {
    const path = bin.startsWith('/') ? (existsSync(bin) ? bin : null) : findBin(bin);
    if (path) console.log(`  ${C.green}✓${C.reset} ${bin.padEnd(34)} ${path}`);
    else      console.log(`  ${C.yellow}–${C.reset} ${bin.padEnd(34)} ${C.yellow}нет (норма)${C.reset}`);
}

// ─── Итог ───────────────────────────────────────────────────────────────

console.log('');
if (missingRequired > 0) {
    fail(`Не хватает ${missingRequired} обязательных бинарников.`);
    console.log('');
    console.log('Возможные причины:');
    console.log('  - пакет называется иначе в вашем репозитории;');
    console.log('  - группа установки провалилась (см. вывод выше);');
    console.log('  - пакет лежит не в $PATH (проверьте /usr/libexec, /usr/lib/kf6).');
    console.log('');
    console.log('Поправьте соответствующий массив в этом файле и запустите снова.');
} else {
    ok('Все обязательные бинарники на месте.');
    console.log('');
    console.log('Что дальше:');
    console.log('  npm start    (из чистой TTY)');
}