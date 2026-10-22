import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMusic } from '../dist/music/renderMusic.js';
import { musicExamplesPack } from '../dist/design/examplesPack.js';

test('renderMusic generates exact bar-by-bar buffer duration, peak <= 0.95, and seamless loop folding', async () => {
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

  let maxPeak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxPeak) maxPeak = abs;
  }

  assert.ok(
    maxPeak <= 0.95 + 1e-4,
    `Music output peak (${maxPeak.toFixed(3)}) must be normalized <= 0.95 to prevent saturation`
  );

  const boundaryJump = Math.abs(samples[0] - samples[samples.length - 1]);
  assert.ok(
    boundaryJump < 0.2,
    `Seamless loop boundary jump (${boundaryJump.toFixed(4)}) must be smooth (< 0.2)`
  );

  console.log(`Measured 2-bar 120 BPM music loop render time: ${blockTimeMs.toFixed(2)} ms`);
});

test('renderMusic drum pattern onsets occur at expected beat intervals', async () => {
  const musicPack = musicExamplesPack();
  const menuMusic = musicPack.find((m) => m.name === 'music_menu');
  assert.ok(menuMusic);

  const { samples, sampleRate } = await renderMusic(menuMusic, { sampleRate: 22050, seed: 42 });

  // 120 BPM = 0.5s per quarter note beat = 11025 samples at 22050 Hz
  const beatSamples = Math.round(0.5 * sampleRate);

  // Check energy peaks around beat 0, beat 1, beat 2, beat 3
  for (let beat = 0; beat < 4; beat++) {
    const expectedSample = beat * beatSamples;
    let localPeak = 0;
    for (let offset = -50; offset <= 50; offset++) {
      const idx = expectedSample + offset;
      if (idx >= 0 && idx < samples.length) {
        const abs = Math.abs(samples[idx]);
        if (abs > localPeak) localPeak = abs;
      }
    }
    assert.ok(
      localPeak > 0.05,
      `Drum onset expected near beat ${beat} (sample ${expectedSample}), found local peak ${localPeak.toFixed(3)}`
    );
  }
});

test('renderMusic supports sections (intro, loopA) and non-looping jingles', async () => {
  const musicPack = musicExamplesPack();
  const sectionMusic = musicPack.find((m) => m.name === 'music_sections_demo');
  assert.ok(sectionMusic, 'music_sections_demo must exist');

  const { samples, exactDurationSeconds } = await renderMusic(sectionMusic, { sampleRate: 22050, seed: 42 });
  assert.equal(exactDurationSeconds, 3 * 2.0); // 3 bars at 120 BPM = 6 seconds
  assert.equal(samples.length, Math.round(6.0 * 22050));
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
