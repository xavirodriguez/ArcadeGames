import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMusic } from '../dist/music/renderMusic.js';
import { musicExamplesPack } from '../dist/design/examplesPack.js';

test('renderMusic generates exact bar-by-bar buffer duration and seamless loop folding', async () => {
  const musicPack = musicExamplesPack();
  const menuMusic = musicPack.find((m) => m.name === 'music_menu');
  assert.ok(menuMusic, 'music_menu must exist in musicExamplesPack');

  const { samples, sampleRate, exactDurationSeconds, blockTimeMs } = await renderMusic(menuMusic, { sampleRate: 22050, seed: 42 });

  const expectedTotalSamples = Math.round(exactDurationSeconds * sampleRate);
  assert.equal(
    samples.length,
    expectedTotalSamples,
    `Rendered music buffer length (${samples.length}) must match exact bar length (${expectedTotalSamples})`
  );

  // Check seamless loop boundary jump
  const boundaryJump = Math.abs(samples[0] - samples[samples.length - 1]);
  assert.ok(
    boundaryJump < 0.2,
    `Seamless loop boundary jump (${boundaryJump.toFixed(4)}) must be smooth (< 0.2)`
  );

  console.log(`Measured 2-bar 120 BPM music loop render time: ${blockTimeMs.toFixed(2)} ms`);
});

test('renderMusic renders non-looping game over jingle cleanly without NaN', async () => {
  const musicPack = musicExamplesPack();
  const gameOverMusic = musicPack.find((m) => m.name === 'music_game_over');
  assert.ok(gameOverMusic);

  const { samples } = await renderMusic(gameOverMusic, { sampleRate: 22050, seed: 42 });
  for (let i = 0; i < samples.length; i++) {
    const val = samples[i];
    assert.ok(!Number.isNaN(val), 'Music sample must not be NaN');
    assert.ok(Number.isFinite(val), 'Music sample must be finite');
  }
});
