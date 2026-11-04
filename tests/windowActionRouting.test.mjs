import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getWindowActionChannel,
  getWindowBoundsChannel,
  isWebWindowLike,
} from '../src/components/windowActionRouting.js';

test('web windows use direct window IPC', () => {
  assert.equal(getWindowActionChannel({ kind: 'our' }, 'close'), 'window:close');
  assert.equal(getWindowActionChannel({ kind: 'our' }, 'minimize'), 'window:minimize');
  assert.equal(getWindowActionChannel({ kind: 'our' }, 'maximize'), 'window:maximize');
  assert.equal(getWindowBoundsChannel({ kind: 'our' }), 'window:set-bounds');
});

test('unknown or missing kind is treated as web window', () => {
  assert.equal(getWindowActionChannel({}, 'close'), 'window:close');
  assert.equal(getWindowActionChannel({ title: 'test' }, 'minimize'), 'window:minimize');
  assert.equal(getWindowActionChannel({ kind: undefined }, 'maximize'), 'window:maximize');
});

test('native windows keep native IPC', () => {
  assert.equal(getWindowActionChannel({ kind: 'native' }, 'close'), 'native-window:close');
  assert.equal(getWindowActionChannel({ kind: 'native' }, 'minimize'), 'native-window:minimize');
  assert.equal(getWindowActionChannel({ kind: 'native' }, 'maximize'), 'native-window:maximize');
  assert.equal(getWindowBoundsChannel({ kind: 'native' }), 'native-window:set-bounds');
});

test('devtools are treated as web windows', () => {
  assert.equal(isWebWindowLike({ kind: 'devtools' }), true);
  assert.equal(getWindowActionChannel({ kind: 'devtools' }, 'close'), 'window:close');
});
