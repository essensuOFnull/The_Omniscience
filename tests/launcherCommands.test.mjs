import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLaunchAppArgs,
  parseLauncherCommand,
  quoteDesktopExecArg,
} from '../main/launcherCommands.js';

test('parses app commands with unrelated Electron arguments', () => {
  assert.deepEqual(
    parseLauncherCommand(['C:\\Program Files\\Omni\\Omni.exe', '--no-sandbox', '--launch-app', 'webapp', 'calculator']),
    { type: 'launch-app', appType: 'webapp', appId: 'calculator' },
  );
});

test('routes background and quit commands', () => {
  assert.deepEqual(parseLauncherCommand(['--background']), { type: 'background' });
  assert.deepEqual(parseLauncherCommand(['--quit']), { type: 'quit' });
});

test('rejects malformed or unsupported app shortcut targets', () => {
  assert.equal(parseLauncherCommand(['--launch-app', 'native', 'shell']).type, 'invalid');
  assert.equal(parseLauncherCommand(['--launch-app', 'webapp']).type, 'invalid');
  assert.throws(() => getLaunchAppArgs('native', 'shell'), TypeError);
  assert.deepEqual(getLaunchAppArgs('componentapp', 'settings'), [
    '--launch-app', 'componentapp', 'settings',
  ]);
});

test('escapes desktop entry executable arguments', () => {
  assert.equal(quoteDesktopExecArg('/opt/Omni with % and "$cash"'), '"/opt/Omni with %% and \\"\\$cash\\""');
});
