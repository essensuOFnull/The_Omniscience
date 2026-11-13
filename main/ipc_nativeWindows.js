import electronPkg from 'electron';
const { app, BrowserWindow, dialog, ipcMain, screen } = electronPkg;
import { spawn, execFile } from 'child_process';
import net from 'net';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import readline from 'readline';
import {
  getWindowById,
  listWindows,
} from './ipc_windowManager.js';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/* Debug                                                               */
/* ------------------------------------------------------------------ */

const DEBUG = process.env.OMNI_NATIVE_DEBUG !== '0';
function dbg(...args) { if (DEBUG) console.log('[nativeWindows]', ...args); }
function dbgWarn(...args) { if (DEBUG) console.warn('[nativeWindows]', ...args); }

function safe(promise, label) {
  if (promise && typeof promise.catch === 'function') {
    promise.catch((e) => {
      if (DEBUG) dbgWarn(`[safe:${label || '?'}]`, e?.message || e);
    });
  }
  return promise;
}

function num(v, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ------------------------------------------------------------------ */
/* Windows native host (powershell.exe)                                */
/* ------------------------------------------------------------------ */

const WIN32_HOST_PATH = fileURLToPath(new URL('./windowsNativeHost.ps1', import.meta.url));
const win32Pending = new Map();
const win32AdminPending = new Map();
const win32DeferredBounds = new Map();
const win32IconCache = new Map();
const win32PendingIcons = new Set();
const win32DockSuppressed = new WeakSet();
const win32DockInitialized = new WeakSet();
let win32DockQueue = Promise.resolve();
let win32Host = null;
let win32AdminServer = null;
let win32AdminSocket = null;
let win32AdminStartPromise = null;
let win32AdminPromptSuppressedUntil = 0;
let win32RequestId = 0;
let win32AdminRequestId = 0;
let win32RefreshTimer = null;
let win32RefreshPromise = null;
let win32Windows = [];
let win32ActiveHwnd = null;
let win32LastHash = '';
let win32TaskbarHidden = false;
let win32ShellRecovery = null;
let win32ShellFailureSuppressedUntil = 0;

let lastNativeState = { windows: [], activeXid: null };

function failWin32Requests(error) {
  for (const { reject, timer } of win32Pending.values()) {
    clearTimeout(timer);
    reject(error);
  }
  win32Pending.clear();
}

function startWin32Host() {
  if (win32Host && !win32Host.killed) return win32Host;

  const child = spawn('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', WIN32_HOST_PATH,
  ], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  win32Host = child;

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (data) => {
    console.error('[nativeWindows:win32]', data.trimEnd());
  });

  const output = readline.createInterface({ input: child.stdout });
  output.on('line', (line) => {
    let response;
    try { response = JSON.parse(line); }
    catch (err) {
      console.error('[nativeWindows:win32] invalid host response:', err.message, line);
      return;
    }

    const pending = win32Pending.get(response.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    win32Pending.delete(response.requestId);
    if (response.success) pending.resolve(response.result);
    else pending.reject(new Error(response.error || 'Windows native request failed'));
  });

  child.on('error', (err) => {
    console.error('[nativeWindows:win32] host process failed:', err.message);
    if (win32Host === child) win32Host = null;
    failWin32Requests(err);
  });
  child.on('close', (code) => {
    output.close();
    if (win32Host === child) win32Host = null;
    if (code !== 0) {
      console.error('[nativeWindows:win32] host exited with code', code);
    }
    failWin32Requests(new Error(`Windows native host exited (${code})`));
  });
  return child;
}

function requestWin32(action, payload = {}, timeoutMs = 10000) {
  const child = startWin32Host();
  const requestId = ++win32RequestId;
  const message = JSON.stringify({ requestId, action, ...payload });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      win32Pending.delete(requestId);
      reject(new Error(`Windows native request timed out: ${action}`));
    }, timeoutMs);
    win32Pending.set(requestId, { resolve, reject, timer });
    child.stdin.write(message + '\n', (err) => {
      if (!err) return;
      clearTimeout(timer);
      win32Pending.delete(requestId);
      reject(err);
    });
  });
}

function getWin32Hwnd(win) {
  try {
    const handle = win.getNativeWindowHandle();
    if (handle.length >= 8) return handle.readBigUInt64LE(0).toString();
    if (handle.length >= 4) return String(handle.readUInt32LE(0));
  } catch (error) {
    console.error('[nativeWindows:win32] failed to read native window handle:', error.message);
  }
  return null;
}

function parseWin32Hwnd(id) {
  try {
    const hwnd = BigInt(String(id));
    return hwnd > 0n ? hwnd.toString() : null;
  } catch {
    return null;
  }
}

export async function setWindowsDesktopWindow(win) {
  if (!win || win.isDestroyed()) return false;
  try {
    const hwnd = getWin32Hwnd(win);
    if (!hwnd) throw new Error('could not read desktop window handle');
    const bounds = screen.getPrimaryDisplay().bounds;
    const rect = screen.dipToScreenRect(null, bounds);
    const attached = await requestWin32('desktop', {
      hwnd, x: rect.x, y: rect.y, width: rect.width, height: rect.height,
    });
    if (!attached) throw new Error('native host did not attach the desktop window');
    return true;
  } catch (error) {
    console.error('[nativeWindows:win32] failed to set desktop window role:', error.message);
    return false;
  }
}

function enqueueWindowsDockOperation(operation) {
  const result = win32DockQueue.then(operation, operation);
  win32DockQueue = result.then(() => undefined, () => undefined);
  return result;
}

export function resetWindowsDock(win) {
  if (!win || win.isDestroyed()) return Promise.resolve(false);
  win32DockInitialized.delete(win);
  return enqueueWindowsDockOperation(async () => {
    if (win.isDestroyed()) return false;
    const hwnd = getWin32Hwnd(win);
    if (!hwnd) return false;
    try {
      const reset = await requestWin32('dock-reset', { hwnd });
      if (reset) win32DockInitialized.add(win);
      return reset;
    } catch (error) {
      console.error('[nativeWindows:win32] failed to reset dock reservation:', error.message);
      return false;
    }
  });
}

export async function updateWindowsDock(win) {
  if (!win || win.isDestroyed()) return false;
  return enqueueWindowsDockOperation(async () => {
    if (win.isDestroyed()) return false;
    if (!win32DockInitialized.has(win)) return false;
    const hwnd = getWin32Hwnd(win);
    if (!hwnd) return false;
    try {
      if (!win.isVisible() || win32DockSuppressed.has(win)) {
        return await requestWin32('dock-remove', { hwnd });
      }
      const rect = screen.dipToScreenRect(null, win.getBounds());
      const registered = await requestWin32('dock', {
        hwnd, x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      });
      if (!registered) console.warn('[nativeWindows:win32] failed to register dock appbar:', hwnd);
      return registered;
    } catch (error) {
      console.error('[nativeWindows:win32] failed to update dock appbar:', error.message);
      return false;
    }
  });
}

export async function removeWindowsDock(win) {
  if (!win) return false;
  win32DockInitialized.delete(win);
  return enqueueWindowsDockOperation(async () => {
    const hwnd = getWin32Hwnd(win);
    if (!hwnd) return false;
    try {
      return await requestWin32('dock-remove', { hwnd });
    } catch (error) {
      console.error('[nativeWindows:win32] failed to release dock reservation:', error.message);
      return false;
    }
  });
}

export async function setWindowsDockSuppressed(win, suppressed) {
  if (!win || win.isDestroyed()) return false;
  if (suppressed) win32DockSuppressed.add(win);
  else win32DockSuppressed.delete(win);
  return updateWindowsDock(win);
}

export async function hideWindowsTaskbar() {
  const hidden = await requestWin32('taskbar-hide');
  if (!hidden) throw new Error('Windows taskbar could not be hidden');
  win32TaskbarHidden = true;
  return true;
}

export async function restoreWindowsTaskbar() {
  const restored = await requestWin32('taskbar-restore');
  if (!restored) throw new Error('Windows taskbar could not be restored');
  win32TaskbarHidden = false;
  return true;
}

export async function hideWindowsDesktopIcons() {
  const hidden = await requestWin32('desktop-icons-hide');
  if (!hidden) throw new Error('Windows desktop icons could not be hidden');
  return true;
}

export async function restoreWindowsDesktopIcons() {
  const restored = await requestWin32('desktop-icons-restore');
  if (!restored) throw new Error('Windows desktop icons could not be restored');
  return true;
}

export async function hideWindowsDesktopWallpaper() {
  const hidden = await requestWin32('desktop-wallpaper-hide');
  if (!hidden) throw new Error('Windows desktop wallpaper could not be disabled');
  return true;
}

export async function restoreWindowsDesktopWallpaper() {
  const restored = await requestWin32('desktop-wallpaper-restore');
  if (!restored) throw new Error('Windows desktop wallpaper could not be restored');
  return true;
}

/* ------------------------------------------------------------------ */
/* Windows shell / autostart                                           */
/* ------------------------------------------------------------------ */

const WINDOWS_USER_SHELL_KEY = 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon';
const WINDOWS_USER_SHELL_POLICY_KEY = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System';
const WINDOWS_MACHINE_SHELL_POLICY_KEY = 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System';
const WINDOWS_MACHINE_WINLOGON_KEY = 'HKLM:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon';
const WINDOWS_RUN_KEY = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
async function runWindowsPowerShell(script) {
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script,
  ], { windowsHide: true, encoding: 'utf8' });
  return stdout.trim();
}

async function readWindowsUserShellRegistry() {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$shellKey = '${WINDOWS_USER_SHELL_KEY}'`,
    `$policyKey = '${WINDOWS_USER_SHELL_POLICY_KEY}'`,
    `$machinePolicyKey = '${WINDOWS_MACHINE_SHELL_POLICY_KEY}'`,
    `$machineWinlogonKey = '${WINDOWS_MACHINE_WINLOGON_KEY}'`,
    `$runKey = '${WINDOWS_RUN_KEY}'`,
    'function Read-RegistryValue($key, $name) {',
    '  if (Test-Path -LiteralPath $key) {',
    '    $item = Get-Item -LiteralPath $key',
    '    if ($item.GetValueNames() -contains $name) {',
    '      return @{ exists = $true; value = [string]$item.GetValue($name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames); kind = $item.GetValueKind($name).ToString() }',
    '    }',
    '  }',
    '  return @{ exists = $false; value = $null; kind = $null }',
    '}',
    '$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value',
    '$result = @{ sid = $sid; shell = (Read-RegistryValue $shellKey "Shell"); policyShell = (Read-RegistryValue $policyKey "Shell"); machinePolicyShell = (Read-RegistryValue $machinePolicyKey "Shell"); machineWinlogonShell = (Read-RegistryValue $machineWinlogonKey "Shell"); run = (Read-RegistryValue $runKey "The_Omniscience") }',
    '$result | ConvertTo-Json -Compress -Depth 4',
  ].join('\n');
  return JSON.parse(await runWindowsPowerShell(script));
}

function getWindowsUserShellBackupPath() {
  return path.join(process.env.ProgramData || 'C:\\ProgramData', 'The_Omniscience', 'windows-shell-backup.json');
}

async function readWindowsUserShellBackup() {
  try {
    return JSON.parse(await readFile(getWindowsUserShellBackupPath(), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function sameRegistrySnapshot(left, right) {
  if (!!left?.exists !== !!right?.exists) return false;
  if (!left?.exists) return true;
  return left.value === right.value && left.kind === right.kind;
}

function isLegacyMachineShellBackup(backup, registry) {
  return backup?.schemaVersion === 3
    && backup.scope === 'machine'
    && typeof backup.command === 'string'
    && registry.machinePolicyShell?.value === backup.command
    && backup.machinePolicyShell
    && typeof backup.machinePolicyShell.exists === 'boolean';
}

function isWinlogonMachineShellBackup(backup) {
  return backup?.schemaVersion === 4
    && backup.scope === 'machine'
    && typeof backup.command === 'string'
    && backup.machinePolicyShell
    && typeof backup.machinePolicyShell.exists === 'boolean'
    && backup.machineWinlogonShell
    && typeof backup.machineWinlogonShell.exists === 'boolean';
}

async function restoreWindowsUserShell() {
  const backupPath = getWindowsUserShellBackupPath();
  const backup = JSON.parse(await readFile(backupPath, 'utf8'));
  const isWinlogonBackup = isWinlogonMachineShellBackup(backup);
  const isLegacyBackup = backup?.schemaVersion === 3
    && backup.scope === 'machine'
    && typeof backup.command === 'string';
  if (!isWinlogonBackup && !isLegacyBackup) {
    throw new Error('Windows shell backup has an unsupported format');
  }
  const registry = await readWindowsUserShellRegistry();
  const currentShell = isWinlogonBackup
    ? registry.machineWinlogonShell
    : registry.machinePolicyShell;
  if (currentShell?.value !== backup.command) {
    throw new Error('The machine-wide shell changed; refusing to overwrite it');
  }
  try {
    if (isWinlogonBackup) {
      await requestWin32Admin('machine-winlogon-restore', {
        backup,
        backupPath,
      });
    } else {
      await requestWin32Admin('machine-shell-restore', {
        expectedCommand: backup.command,
        machinePolicyShell: backup.machinePolicyShell,
        backupPath,
      });
    }
  } catch (error) {
    const current = await readWindowsUserShellRegistry().catch(() => null);
    const currentCommand = isWinlogonBackup
      ? current?.machineWinlogonShell?.value
      : current?.machinePolicyShell?.value;
    if (currentCommand === backup.command) throw error;
  }
  const restored = await readWindowsUserShellRegistry();
  if (isWinlogonBackup) {
    if (!sameRegistrySnapshot(restored.machineWinlogonShell, backup.machineWinlogonShell)
      || !sameRegistrySnapshot(restored.machinePolicyShell, backup.machinePolicyShell)) {
      throw new Error('Machine Winlogon shell restoration did not verify');
    }
  } else if (!sameRegistrySnapshot(restored.machinePolicyShell, backup.machinePolicyShell)) {
    throw new Error('Legacy machine policy restoration did not verify');
  }
  await unlink(backupPath);
  return { ok: true, restartRequired: true };
}

export async function restoreWindowsShellForAutostart() {
  const backup = await readWindowsUserShellBackup();
  if (!backup) {
    const registry = await readWindowsUserShellRegistry();
    if (/OmniShellHost\.exe/i.test(registry.machineWinlogonShell?.value || '')) {
      throw new Error('Omniscience is still configured as the machine shell, but its recovery backup is missing');
    }
    return false;
  }

  const registry = await readWindowsUserShellRegistry();
  const managedShellIsActive = isLegacyMachineShellBackup(backup, registry)
    || (isWinlogonMachineShellBackup(backup)
      && registry.machineWinlogonShell?.value === backup.command);
  if (!managedShellIsActive) return false;

  await restoreWindowsUserShell();
  return true;
}

async function ensureExplorerShell() {
  let status = await requestWin32('explorer-shell-status');
  if (!status?.taskbar) {
    const started = await requestWin32('explorer-shell-start');
    if (!started) throw new Error('Explorer did not restore its taskbar');
    status = await requestWin32('explorer-shell-status');
  }
  if (!status?.taskbar) throw new Error('Explorer taskbar is unavailable');
  const restored = await requestWin32('taskbar-restore');
  if (!restored) throw new Error('Windows taskbar could not be restored');
  await restoreWindowsDesktopIcons();
  await restoreWindowsDesktopWallpaper();
  status = await requestWin32('explorer-shell-status');
  if (!status?.taskbarVisible) {
    throw new Error('Explorer taskbar is not visible after restoration');
  }
  win32TaskbarHidden = false;
  global.topbarBroadcast?.();
  return true;
}

async function showWindowsShellError(reason, explorerRestored) {
  const detail = explorerRestored
    ? 'Панель задач Explorer восстановлена.'
    : 'Не удалось подтвердить восстановление панели. Запустите explorer.exe вручную через Диспетчер задач.';
  try {
    await dialog.showMessageBox({
      type: explorerRestored ? 'warning' : 'error',
      title: 'Ошибка панели Omniscience',
      message: 'Не удалось надёжно отобразить панель Omniscience.',
      detail: `${reason || 'Ошибка отрисовки панели.'}\n\n${detail}`,
      buttons: ['OK'],
    });
  } catch (error) {
    console.error('[windows-shell] failed to show recovery dialog:', error.message);
  }
}

export async function recoverWindowsShell(reason) {
  if (win32ShellRecovery) return win32ShellRecovery;
  if (Date.now() < win32ShellFailureSuppressedUntil) return !win32TaskbarHidden;
  win32ShellFailureSuppressedUntil = Date.now() + 10000;
  win32ShellRecovery = (async () => {
    let restored = false;
    try {
      await ensureExplorerShell();
      restored = true;
    } catch (error) {
      console.error('[windows-shell] Explorer recovery failed:', error.message);
    }
    console.error('[windows-shell] renderer failure:', reason || 'unknown rendering error');
    await showWindowsShellError(reason, restored);
    return restored;
  })().finally(() => {
    win32ShellRecovery = null;
  });
  return win32ShellRecovery;
}

export async function restoreWindowsExplorerForShutdown() {
  try {
    await ensureExplorerShell();
    return true;
  } catch (error) {
    console.error('[windows-shell] failed to restore Explorer during shutdown:', error.message);
    await showWindowsShellError(error.message, false);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Windows admin helper (elevation via named pipe)                     */
/* ------------------------------------------------------------------ */

function failWin32AdminRequests(error) {
  for (const { reject, timer } of win32AdminPending.values()) {
    clearTimeout(timer);
    reject(error);
  }
  win32AdminPending.clear();
}

function acceptWin32AdminSocket(socket) {
  if (win32AdminSocket) {
    socket.destroy();
    return;
  }
  win32AdminSocket = socket;
  const output = readline.createInterface({ input: socket });
  output.on('line', (line) => {
    let response;
    try { response = JSON.parse(line); }
    catch (err) {
      console.error('[nativeWindows:admin] invalid helper response:', err.message, line);
      return;
    }
    const pending = win32AdminPending.get(response.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    win32AdminPending.delete(response.requestId);
    if (response.success) pending.resolve(response.result);
    else pending.reject(new Error(response.error || 'Elevated Windows request failed'));
  });
  socket.on('error', (err) => {
    console.error('[nativeWindows:admin] helper pipe failed:', err.message);
  });
  socket.on('close', () => {
    output.close();
    if (win32AdminSocket === socket) win32AdminSocket = null;
    failWin32AdminRequests(new Error('Elevated Windows helper disconnected'));
  });
}

function startWin32AdminHost() {
  if (win32AdminSocket) return Promise.resolve();
  if (win32AdminStartPromise) return win32AdminStartPromise;

  const pipeName = `Omni-${randomUUID().replace(/-/g, '')}`;
  const pipePath = `\\\\.\\pipe\\${pipeName}`;
  const server = net.createServer((socket) => {
    acceptWin32AdminSocket(socket);
    connected = true;
    completeIfReady();
  });
  win32AdminServer = server;

  let connected = false;
  let launched = false;
  let settled = false;
  let timer;
  let resolveStart;
  let rejectStart;
  const started = new Promise((resolve, reject) => {
    resolveStart = resolve;
    rejectStart = reject;
  });
  win32AdminStartPromise = started;
  started.then(
    () => { if (win32AdminStartPromise === started) win32AdminStartPromise = null; },
    () => { if (win32AdminStartPromise === started) win32AdminStartPromise = null; },
  );

  const completeIfReady = () => {
    if (settled || !connected || !launched) return;
    settled = true;
    clearTimeout(timer);
    server.close();
    if (win32AdminServer === server) win32AdminServer = null;
    resolveStart();
  };
  const fail = (error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (server.listening) server.close();
    if (win32AdminServer === server) win32AdminServer = null;
    if (win32AdminSocket) {
      win32AdminSocket.destroy();
      win32AdminSocket = null;
    }
    rejectStart(error);
  };

  timer = setTimeout(() => fail(new Error('Timed out waiting for administrator approval')), 120000);
  server.once('error', fail);
  server.listen(pipePath, () => {
    const powershellPath = path.join(
      process.env.SystemRoot || 'C:\\Windows',
      'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe',
    );
    const arguments_ = [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', WIN32_HOST_PATH, '-PipeName', pipeName,
    ].map(quoteWindowsArgument).join(' ');
    requestWin32('elevate', {
      executable: powershellPath,
      arguments: arguments_,
      directory: app.getAppPath(),
    }, 120000).then((result) => {
      if (!result) return fail(new Error('Administrator approval was cancelled'));
      launched = true;
      completeIfReady();
    }).catch(fail);
  });
  return started;
}

async function requestWin32Admin(action, payload = {}) {
  await startWin32AdminHost();
  const socket = win32AdminSocket;
  if (!socket) throw new Error('Elevated Windows helper is not connected');
  const requestId = ++win32AdminRequestId;
  const message = JSON.stringify({ requestId, action, ...payload });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      win32AdminPending.delete(requestId);
      reject(new Error(`Elevated Windows request timed out: ${action}`));
    }, 15000);
    win32AdminPending.set(requestId, { resolve, reject, timer });
    socket.write(message + '\n', (err) => {
      if (!err) return;
      clearTimeout(timer);
      win32AdminPending.delete(requestId);
      reject(err);
    });
  });
}

async function elevateWin32WindowAction(action, payload) {
  if (Date.now() < win32AdminPromptSuppressedUntil) return false;
  const start = win32AdminStartPromise || startWin32AdminHost();
  if (action === 'bounds') win32DeferredBounds.set(payload.hwnd, payload);
  try {
    await start;
  } catch (error) {
    win32DeferredBounds.delete(payload.hwnd);
    win32AdminPromptSuppressedUntil = Date.now() + 30000;
    throw error;
  }
  if (action !== 'bounds') return requestWin32Admin(action, payload);
  const latestBounds = win32DeferredBounds.get(payload.hwnd);
  if (!latestBounds) return false;
  win32DeferredBounds.delete(payload.hwnd);
  return requestWin32Admin(action, latestBounds);
}

async function requestWin32WindowAction(action, payload, { elevateOnFailure = false } = {}) {
  let result;
  try {
    result = await requestWin32(action, payload);
  } catch (error) {
    if (!/\baccess_denied\b/i.test(error?.message || '')) throw error;
    if (win32AdminSocket) return requestWin32Admin(action, payload);
    if (!elevateOnFailure) return false;
    return elevateWin32WindowAction(action, payload);
  }
  if (result) return true;
  if (win32AdminSocket) return requestWin32Admin(action, payload);
  return false;
}

/* ------------------------------------------------------------------ */
/* Иконки (Windows: из процессов через app.getFileIcon)                */
/* ------------------------------------------------------------------ */

function cacheWin32Icon(imagePath) {
  if (!imagePath || win32IconCache.has(imagePath) || win32PendingIcons.has(imagePath)) return;
  win32PendingIcons.add(imagePath);
  app.getFileIcon(imagePath, { size: 'normal' }).then((image) => {
    const dataUrl = image && !image.isEmpty() ? image.toDataURL() : null;
    win32IconCache.set(imagePath, dataUrl);
    if (dataUrl) pushNativeState();
  }).catch((err) => {
    console.warn('[nativeWindows:win32] failed to load process icon:', imagePath, err.message);
    win32IconCache.set(imagePath, null);
  }).finally(() => {
    win32PendingIcons.delete(imagePath);
  });
}

/* ------------------------------------------------------------------ */
/* Публикация состояния окон                                          */
/* ------------------------------------------------------------------ */

function computeNativeState() {
  return {
    windows: win32Windows.map((window) => ({
      ...window,
      icon: window.imagePath
        ? win32IconCache.get(window.imagePath) || null
        : (window.icon ?? null),
    })),
    activeXid: win32ActiveHwnd ?? null,
  };
}

/**
 * Единственная точка публикации состояния.
 * Пишет в lastNativeState, глобалы и рассылает событие в topbar + mainWindow.
 */
function pushNativeState() {
  const state = computeNativeState();
  lastNativeState = state;
  global.__lastNativeWindows = state.windows;
  global.__activeXid = state.activeXid;

  try { global.topbarBroadcast?.(); } catch { /* ignore */ }

  for (const target of [global.mainWindow, global.topbarWindow]) {
    if (!target || target.isDestroyed?.()) continue;
    try {
      target.webContents.send('shell:native-windows-updated', state.windows);
    } catch { /* ignore */ }
  }
}

async function refreshWin32Windows() {
  if (win32RefreshPromise) return win32RefreshPromise;
  win32RefreshPromise = (async () => {
    const [windows, activeHwnd] = await Promise.all([
      requestWin32('list', { ownPid: process.pid }),
      requestWin32('active'),
    ]);
    const rawWindows = Array.isArray(windows)
      ? windows
      : (windows && typeof windows === 'object' ? [windows] : []);

    const next = rawWindows.map((window) => {
      const rect = screen.screenToDipRect(null, {
        x: window.x, y: window.y,
        width: window.width, height: window.height,
      });
      return { ...window, ...rect };
    });
    for (const window of next) cacheWin32Icon(window.imagePath);
    const hash = JSON.stringify([next, activeHwnd]);
    if (hash === win32LastHash) return;
    win32LastHash = hash;
    win32Windows = next;
    win32ActiveHwnd = activeHwnd;
    pushNativeState();
  })().catch((err) => {
    console.error('[nativeWindows:win32] refresh failed:', err.message);
  }).finally(() => {
    win32RefreshPromise = null;
  });
  return win32RefreshPromise;
}

/* ------------------------------------------------------------------ */
/* resolveTarget / операции над окнами                                */
/* ------------------------------------------------------------------ */

function quoteWindowsArgument(value) {
  const text = String(value);
  let quoted = '"';
  let backslashes = 0;
  for (const char of text) {
    if (char === '\\') {
      backslashes++;
    } else if (char === '"') {
      quoted += '\\'.repeat(backslashes * 2 + 1) + '"';
      backslashes = 0;
    } else {
      quoted += '\\'.repeat(backslashes) + char;
      backslashes = 0;
    }
  }
  return quoted + '\\'.repeat(backslashes * 2) + '"';
}

function resolveTarget(id) {
  if (id == null) return null;
  try {
    const candidates = Array.from(new Set([
      id,
      String(id),
      Number(id),
      id && typeof id === 'string' ? id.trim() : id,
      id && typeof id === 'string' ? id.replace(/^['"]|['"]$/g, '') : id,
    ].filter((value) => value !== null && value !== undefined && value !== '')));

    for (const candidate of candidates) {
      const our = getWindowById(candidate);
      if (our) return { kind: 'our', appId: candidate };
    }

    for (const entry of listWindows()) {
      if (!entry || !entry.id) continue;
      if (candidates.some((candidate) =>
        String(entry.id) === String(candidate)
        || String(entry.appId || '') === String(candidate)
      )) {
        return { kind: 'our', appId: entry.id };
      }
    }

    const hwnd = parseWin32Hwnd(id);
    return hwnd ? { kind: 'native', hwnd } : null;
  } catch {
    return null;
  }
}

export async function focusWindowById(id) {
  try {
    const t = resolveTarget(id);
    if (!t) return { ok: false };

    if (t.kind === 'our') {
      const w = getWindowById(t.appId);
      if (!w || w.isDestroyed()) return { ok: false };
      try {
        // Восстанавливаем ТОЛЬКО реально свёрнутое окно.
        // show()/moveTop() на видимом fullscreen-окне в Electron
        // сбрасывают fullscreen — поэтому их не зовём.
        if (w.isMinimized()) w.restore();
        else if (!w.isVisible()) w.show();
        w.focus();
      } catch { /* ignore */ }
      return { ok: true };
    }

    if (t.kind === 'native' && t.hwnd) {
      const ok = await requestWin32WindowAction('focus', {
        hwnd: t.hwnd,
        restoreIfMinimized: true,
      });
      await refreshWin32Windows();
      return { ok };
    }

    return { ok: false };
  } catch (e) {
    if (DEBUG) dbgWarn('focusWindowById error:', e?.message || e);
    return { ok: false };
  }
}

export async function closeWindowById(id) {
  try {
    const t = resolveTarget(id);
    if (!t) return { ok: false };
    if (t.kind === 'our') {
      const w = getWindowById(t.appId);
      if (w) w.close();
      return { ok: true };
    }
    if (t.kind === 'native' && t.hwnd) {
      return { ok: await requestWin32WindowAction('close', { hwnd: t.hwnd }) };
    }
    return { ok: false };
  } catch (e) {
    if (DEBUG) dbgWarn('closeWindowById error:', e?.message || e);
    return { ok: false };
  }
}

export async function minimizeWindowById(id) {
  try {
    const t = resolveTarget(id);
    if (!t) return { ok: false };
    if (t.kind === 'our') {
      const w = getWindowById(t.appId);
      if (w) w.minimize();
      return { ok: true };
    }
    if (t.kind === 'native' && t.hwnd) {
      return { ok: await requestWin32WindowAction('minimize', { hwnd: t.hwnd }) };
    }
    return { ok: false };
  } catch (e) {
    if (DEBUG) dbgWarn('minimizeWindowById error:', e?.message || e);
    return { ok: false };
  }
}

export async function maximizeWindowById(id, _maximizedFromUi) {
  try {
    const t = resolveTarget(id);
    if (!t) return { ok: false };

    if (t.kind === 'our') {
      const w = getWindowById(t.appId);
      if (w && !w.isDestroyed()) {
        // Toggle по фактическому состоянию — не доверяем UI.
        if (w.isMaximized()) w.unmaximize();
        else w.maximize();
      }
      return { ok: true };
    }

    if (t.kind === 'native' && t.hwnd) {
      // PS1 сам прочитает IsZoomed и переключит. Не доверяем UI-флагу.
      return { ok: await requestWin32WindowAction('toggle-maximize', { hwnd: t.hwnd }) };
    }

    return { ok: false };
  } catch (e) {
    if (DEBUG) dbgWarn('maximizeWindowById error:', e?.message || e);
    return { ok: false };
  }
}

/* ------------------------------------------------------------------ */
/* Прозрачность (только для наших Electron-окон)                      */
/* ------------------------------------------------------------------ */

export async function setWindowOpacityById(id, opacity) {
  const t = resolveTarget(id);
  if (!t) return { ok: false };

  const clamped = Math.max(0, Math.min(1, Number(opacity)));
  if (!Number.isFinite(clamped)) return { ok: false };

  if (t.kind !== 'our') return { ok: false };

  const w = getWindowById(t.appId);
  if (!w || w.isDestroyed()) return { ok: false };
  try { w.setOpacity(Math.max(0.05, clamped)); } catch { /* ignore */ }
  return { ok: true };
}

export async function getWindowOpacityById(id) {
  const t = resolveTarget(id);
  if (!t) return { ok: false, opacity: 1 };
  if (t.kind !== 'our') return { ok: true, opacity: 1 };

  const w = getWindowById(t.appId);
  if (!w || w.isDestroyed()) return { ok: true, opacity: 1 };
  try { return { ok: true, opacity: w.getOpacity() }; }
  catch { return { ok: true, opacity: 1 }; }
}

/* ------------------------------------------------------------------ */
/* Совместимость API (бывшие X11-функции — no-op)                     */
/* ------------------------------------------------------------------ */

export function registerShellXid(_xid) { /* no-op on Windows */ }
export function unregisterShellXid(_xid) { /* no-op on Windows */ }
export function isX11Available() { return false; }

export function getNativeState() {
  return computeNativeState();
}

/* ------------------------------------------------------------------ */
/* export default                                                      */
/* ------------------------------------------------------------------ */

let initialized = false;

export default async function () {
  if (initialized) return;
  initialized = true;

  startWin32Host();
  refreshWin32Windows();
  win32RefreshTimer = setInterval(refreshWin32Windows, 500);

  ipcMain.handle('windows:request-admin', async () => {
    try {
      await startWin32AdminHost();
      return { ok: true };
    } catch (err) {
      console.error('[nativeWindows:admin] helper startup failed:', err.message);
      return { ok: false, error: err.message };
    }
  });

  app.once('will-quit', () => {
    if (win32RefreshTimer) clearInterval(win32RefreshTimer);
    win32RefreshTimer = null;
    if (win32Host && !win32Host.killed) {
      const host = win32Host;
      if (host.stdin && !host.stdin.destroyed) host.stdin.end();
      const shutdownTimer = setTimeout(() => {
        if (!host.killed) host.kill();
      }, 1500);
      shutdownTimer.unref();
    }
    win32Host = null;
    if (win32AdminSocket) win32AdminSocket.end();
    win32AdminSocket = null;
    if (win32AdminServer) win32AdminServer.close();
    win32AdminServer = null;
    failWin32AdminRequests(new Error('Application is shutting down'));
  });

  /* -------- prepare-drag -------- */
  ipcMain.handle('native-window:prepare-drag', async (_e, { id, mode, direction }) => {
    try {
      const t = resolveTarget(id);
      if (!t) return { ok: false, abort: true };

      let hwnd = t.hwnd;
      if (t.kind === 'native' && !win32Windows.some((window) => window.id === hwnd)) {
        return { ok: false, abort: true };
      }
      if (t.kind === 'our') {
        const targetWindow = getWindowById(t.appId);
        if (!targetWindow) return { ok: false, abort: true };
        hwnd = getWin32Hwnd(targetWindow);
      }
      if (!hwnd) return { ok: false, abort: true };

      const prepared = await requestWin32('prepare-drag', { hwnd, mode, direction });
      if (!prepared) return { ok: false, abort: true };
      const bounds = screen.screenToDipRect(null, {
        x: prepared.x, y: prepared.y,
        width: prepared.width, height: prepared.height,
      });
      const cursor = screen.screenToDipPoint({
        x: prepared.cursorX, y: prepared.cursorY,
      });
      return { ok: true, kind: 'native', nativeDrag: prepared.nativeDrag, cursor, bounds };
    } catch (e) {
      if (DEBUG) dbgWarn('prepare-drag error:', e?.message || e);
      return { ok: false, abort: true };
    }
  });

  /* -------- set-bounds -------- */
  ipcMain.on('native-window:set-bounds', async (_e, { id, bounds }) => {
    try {
      const t = resolveTarget(id);
      if (!t || !bounds) return;

      if (t.kind === 'our') {
        const w = getWindowById(t.appId);
        if (w) {
          w.setBounds({
            x: Math.round(num(bounds.x)),
            y: Math.round(num(bounds.y)),
            width: Math.round(num(bounds.width, 100)),
            height: Math.round(num(bounds.height, 100)),
          });
        }
        return;
      }
      if (t.kind === 'native' && t.hwnd) {
        if (!win32Windows.some((window) => window.id === t.hwnd)) return;
        const rect = screen.dipToScreenRect(null, bounds);
        const ok = await requestWin32WindowAction('bounds', {
          hwnd: t.hwnd,
          x: rect.x, y: rect.y,
          width: rect.width, height: rect.height,
        }, { elevateOnFailure: true });
        if (!ok) console.warn('[nativeWindows:win32] SetWindowPos was denied for window', t.hwnd);
      }
    } catch (e) {
      console.warn('[nativeWindows:win32] privileged window move failed:', e?.message || e);
    }
  });

  ipcMain.on('native-window:drag-end', () => {
    safe(refreshWin32Windows(), 'drag-end.refresh');
  });

  /* -------- прямые IPC-каналы -------- */
  ipcMain.handle('native-window:focus', (_e, { id }) => focusWindowById(id));
  ipcMain.handle('native-window:close', (_e, { id }) => closeWindowById(id));
  ipcMain.handle('native-window:minimize', (_e, { id }) => minimizeWindowById(id));
  ipcMain.handle('native-window:maximize', (_e, { id, maximized }) =>
    maximizeWindowById(id, maximized));

  ipcMain.handle('native-window:get-bounds', async (_e, { id }) => {
    try {
      const t = resolveTarget(id);
      if (!t) return null;
      if (t.kind === 'our') {
        const w = getWindowById(t.appId);
        if (w) { const b = w.getBounds(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }
        return null;
      }
      if (t.kind === 'native' && t.hwnd) {
        const native = win32Windows.find((window) => window.id === t.hwnd);
        if (!native) return null;
        const rect = screen.screenToDipRect(null, {
          x: native.x, y: native.y,
          width: native.width, height: native.height,
        });
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }
      return null;
    } catch {
      return null;
    }
  });

  /* -------- shell-интеграции (Windows-only) -------- */
  ipcMain.handle('shell:run-krunner', async () => {
    return { ok: false, error: 'unsupported_on_windows' };
  });

  ipcMain.handle('shell:systemsettings', async () => {
    try {
      await electronPkg.shell.openExternal('ms-settings:');
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('shell:logout', async () => {
    app.quit();
    return { ok: true };
  });

  ipcMain.handle('native-window:set-opacity', async (_e, { id, opacity }) => {
    return setWindowOpacityById(id, opacity);
  });

  ipcMain.handle('native-window:get-opacity', async (_e, { id }) => {
    return getWindowOpacityById(id);
  });

  ipcMain.handle('native-windows:get-state', () => getNativeState());
  ipcMain.handle('shell:get-native-state', () => getNativeState());

  return null;
}