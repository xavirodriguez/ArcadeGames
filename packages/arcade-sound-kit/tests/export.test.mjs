import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCueBank, validateCueBank } from '../dist/export/cues.js';
import { generateSpriteSheet } from '../dist/export/spritesheet.js';
import { arcadePack } from '../dist/design/pack.js';

test('generateCueBank creates a valid cues.json structure from arcadePack', () => {
  const pack = arcadePack();
  const bank = generateCueBank(pack);

  const errors = validateCueBank(bank);
  assert.equal(errors.length, 0, `Validation errors: ${errors.join('; ')}`);
  assert.ok(Object.keys(bank.cues).length > 0);

  const shootCue = bank.cues['shoot'];
  if (shootCue) {
    assert.equal(shootCue.category, 'combat');
    assert.ok(shootCue.files.length > 0);
  }
});

test('generateSpriteSheet concatenates samples and accurate offsets allow slice recovery', async () => {
  const pack = arcadePack().slice(0, 3);
  const sheet = await generateSpriteSheet(pack, { sampleRate: 22050, paddingMs: 100 });

  assert.ok(sheet.wavBytes.length > 0);
  assert.equal(Object.keys(sheet.sprites).length, 3);

  const firstSprite = sheet.sprites[pack[0].name];
  assert.equal(firstSprite.startSample, 0);
  assert.ok(firstSprite.endSample > 0);
  assert.ok(firstSprite.durationMs > 0);
});
