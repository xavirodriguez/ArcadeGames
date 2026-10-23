import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSystemPlayerPlatform } from '../dist/export/playerLauncher.js';

test('detectSystemPlayerPlatform detects correct launcher command by OS platform', () => {
  const mac = detectSystemPlayerPlatform('darwin');
  assert.equal(mac.command, 'afplay');
  assert.deepEqual(mac.args('/tmp/test.wav'), ['/tmp/test.wav']);

  const linux = detectSystemPlayerPlatform('linux');
  assert.equal(linux.command, 'paplay');
  assert.deepEqual(linux.args('/tmp/test.wav'), ['/tmp/test.wav']);

  const win = detectSystemPlayerPlatform('win32');
  assert.equal(win.command, 'powershell');
  assert.ok(win.args('C:\\temp\\test.wav')[1].includes('SoundPlayer'));
});
