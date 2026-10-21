#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import readline from 'node:readline';
import {
  arcadePack,
  generateSet,
  renderFinal,
  encodeWav,
  validateRecipe,
  GenerateProgressEvent,
  DEFAULT_SAMPLE_RATE,
  SoundRecipe,
  SoundArchetype,
} from './index';
import { playWavFile, registerTempWav } from './export/playerLauncher';

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

function progressBar(index: number, total: number, width = 24): string {
  if (total <= 0) return '[' + ' '.repeat(width) + ']';
  const ratio = Math.min(1, index / total);
  const filled = Math.round(ratio * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
}

function renderProgressLine(ev: GenerateProgressEvent, verbose: boolean): string {
  const pct = ev.total > 0 ? Math.round((ev.index / ev.total) * 100) : 0;
  const bar = progressBar(ev.index, ev.total);
  const phase = ev.phase === 'start' ? '…' : '✓';
  const name = `${ev.category}/${ev.name}`;
  let line = `${bar} ${String(pct).padStart(3)}%  ${ev.index}/${ev.total}  ${phase} ${name}`;
  line += `  (${formatMs(ev.elapsedMs)})`;
  if (verbose && ev.phase === 'done' && ev.file) {
    line += `  → ${ev.file}`;
  }
  return line;
}

async function handlePreviewCommand(args: string[]) {
  const seedIdx = args.indexOf('--seed');
  const sampleRateIdx = args.indexOf('--sample-rate');
  const variantsIdx = args.indexOf('--variants');
  const nameIdx = args.indexOf('--name');
  const loopIdx = args.indexOf('--loop');
  const gapIdx = args.indexOf('--gap');

  let seed = seedIdx >= 0 ? Number(args[seedIdx + 1]) : 42;
  let sampleRate = sampleRateIdx >= 0 ? Number(args[sampleRateIdx + 1]) : DEFAULT_SAMPLE_RATE;
  let variants = variantsIdx >= 0 ? Number(args[variantsIdx + 1]) : 1;
  const targetName = nameIdx >= 0 ? args[nameIdx + 1] : undefined;
  const loopCount = loopIdx >= 0 ? Math.max(1, Number(args[loopIdx + 1])) : 1;
  const gapMs = gapIdx >= 0 ? Math.max(0, Number(args[gapIdx + 1])) : 100;

  const isWatch = args.includes('--watch');
  const isInteractive = args.includes('--interactive');

  let recipe: SoundRecipe | null = null;
  let recipeFile: string | null = null;

  if (args.includes('--pack')) {
    const pack = arcadePack();
    recipe = targetName ? pack.find((r) => r.name === targetName) ?? pack[0] : pack[0];
  } else {
    recipeFile = args.find((a) => !a.startsWith('--') && a !== 'preview') ?? null;
    if (recipeFile) {
      try {
        const resolved = path.resolve(recipeFile);
        const mod = await import(pathToFileURL(resolved).href);
        const loaded = mod.default ?? mod.recipe ?? mod;
        recipe = Array.isArray(loaded) ? loaded[0] : loaded;
      } catch (err: unknown) {
        console.error(`Failed to load recipe file "${recipeFile}":`, err);
        process.exit(1);
      }
    }
  }

  if (!recipe) {
    console.error('No recipe specified for preview. Use preview --pack --name <sfx> or preview <recipe-file.js>');
    process.exit(1);
  }

  const issues = validateRecipe(recipe, sampleRate);
  if (issues.length > 0) {
    console.error(`Recipe validation error for "${recipe.name}":`, issues.map((i) => i.message).join(', '));
    process.exit(1);
  }

  const renderAndPlay = async (currentRecipe: SoundRecipe) => {
    try {
      const tmpDir = os.tmpdir();

      for (let v = 0; v < variants; v++) {
        const suffix = variants > 1 ? `_v${v + 1}` : '';
        const tmpFile = path.join(tmpDir, `ask_preview_${currentRecipe.name}${suffix}_${Date.now()}.wav`);
        registerTempWav(tmpFile);

        const { samples, sampleRate: sr } = await renderFinal(currentRecipe, { sampleRate, seed }, v);

        // Concatenate loop repetitions with silence gap if loopCount > 1
        let finalSamples = samples;
        if (loopCount > 1) {
          const gapSamplesCount = Math.round((gapMs / 1000) * sr);
          const singleLen = samples.length + gapSamplesCount;
          const totalLen = singleLen * loopCount;
          finalSamples = new Float32Array(totalLen);
          for (let l = 0; l < loopCount; l++) {
            finalSamples.set(samples, l * singleLen);
          }
        }

        const wavBytes = encodeWav(finalSamples, { sampleRate: sr, seed });
        fs.writeFileSync(tmpFile, wavBytes);

        console.log(`[Preview] Playing "${currentRecipe.name}" (variant ${v + 1}/${variants}, seed=${seed}, sr=${sr}Hz, loop=${loopCount})…`);
        playWavFile(tmpFile);
      }
    } catch (err) {
      console.error('Preview render failed:', err);
    }
  };

  await renderAndPlay(recipe);

  if (isWatch && recipeFile) {
    const resolvedPath = path.resolve(recipeFile);
    let debounceTimer: NodeJS.Timeout | null = null;
    let currentValidRecipe = recipe;

    console.log(`[Watch] Watching ${recipeFile} for changes…`);
    fs.watch(resolvedPath, (event) => {
      if (event === 'change') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            const mod = await import(`${pathToFileURL(resolvedPath).href}?update=${Date.now()}`);
            const updated = mod.default ?? mod.recipe ?? mod;
            const newRecipe = Array.isArray(updated) ? updated[0] : updated;

            const errs = validateRecipe(newRecipe, sampleRate);
            if (errs.length > 0) {
              console.error(`[Watch] Invalid recipe update: ${errs.map((e) => e.message).join('; ')}. Retaining previous version.`);
            } else {
              currentValidRecipe = newRecipe;
              console.log(`[Watch] File changed. Re-rendering ${currentValidRecipe.name}…`);
              await renderAndPlay(currentValidRecipe);
            }
          } catch (e) {
            console.error('[Watch] Error reloading recipe:', e);
          }
        }, 150);
      }
    });
  }

  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'preview> ',
    });

    console.log(`Interactive preview mode active. Commands:
  seed <n>       Set RNG seed
  pitch <hz>     Set base pitch/frequency
  variants <n>   Set variant count
  play           Render and play
  save           Save WAV to current directory
  exit           Quit interactive mode
`);
    rl.prompt();

    rl.on('line', async (line) => {
      const [cmd, val] = line.trim().split(/\s+/);
      if (cmd === 'seed' && val) {
        seed = Number(val) || 42;
        console.log(`Seed set to ${seed}`);
      } else if (cmd === 'pitch' && val && recipe) {
        const pitchHz = Number(val);
        if (Number.isFinite(pitchHz) && pitchHz > 0) {
          recipe = {
            ...recipe,
            layers: recipe.layers.map((l) => ({ ...l, frequency: pitchHz })),
          };
          console.log(`Base pitch set to ${pitchHz} Hz`);
        }
      } else if (cmd === 'variants' && val) {
        variants = Math.max(1, Number(val) || 1);
        console.log(`Variants set to ${variants}`);
      } else if (cmd === 'play') {
        if (recipe) await renderAndPlay(recipe);
      } else if (cmd === 'save') {
        if (recipe) {
          const { samples, sampleRate: sr } = await renderFinal(recipe, { sampleRate, seed }, 0);
          const wavBytes = encodeWav(samples, { sampleRate: sr, seed });
          const outFile = `./${recipe.name}.wav`;
          fs.writeFileSync(outFile, wavBytes);
          console.log(`Saved ${outFile}`);
        }
      } else if (cmd === 'exit' || cmd === 'quit') {
        rl.close();
        process.exit(0);
      }
      rl.prompt();
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'preview') {
    await handlePreviewCommand(args);
    return;
  }

  if (cmd === 'audit') {
    const packIdx = args.indexOf('--pack');
    const dirIdx = args.indexOf('--dir');
    const outDir = dirIdx >= 0 ? args[dirIdx + 1] : './out';
    const failOnIdx = args.indexOf('--fail-on');

    const { arcadePack } = await import('./design/pack.js');
    const { renderFinal } = await import('./index.js');
    const { analyzeAudioBuffer, findSimilarPairs } = await import('./core/analysis.js');

    const recipes = arcadePack();
    const results = [];

    console.log(`Auditing ${recipes.length} recipes in arcadePack()…`);
    for (const r of recipes) {
      const { samples, sampleRate } = await renderFinal(r, { sampleRate: 22050 }, 0);
      const analysis = analyzeAudioBuffer(r.name, r.category, samples, sampleRate, r.duration, r.loop);
      results.push(analysis);
    }

    const similarPairs = findSimilarPairs(results, 0.15);

    fs.mkdirSync(outDir, { recursive: true });
    const jsonPath = path.join(outDir, 'audit.json');
    const mdPath = path.join(outDir, 'audit.md');

    fs.writeFileSync(jsonPath, JSON.stringify({ results, similarPairs }, null, 2));

    let md = `# Quality Audit Report\n\nTotal sounds analyzed: ${results.length}\nSimilar sound pairs found: ${similarPairs.length}\n\n`;
    md += `| Name | Category | Peak | RMS (dB) | LUFS | DC Offset | Clipped | Initial Sil (ms) | Loop Jump | Centroid (Hz) |\n`;
    md += `|---|---|---|---|---|---|---|---|---|---|\n`;

    let failedRules: string[] = [];

    for (const r of results) {
      md += `| ${r.name} | ${r.category} | ${r.peak.toFixed(3)} | ${r.rmsDb.toFixed(1)} | ${r.lufs.toFixed(1)} | ${r.dcOffset.toFixed(4)} | ${r.clippedSamples} | ${r.initialSilenceMs.toFixed(1)} | ${r.loopJump.toFixed(3)} | ${Math.round(r.spectralCentroidHz)} |\n`;

      if (r.clippedSamples > 0) failedRules.push(`${r.name}: clipped samples (${r.clippedSamples})`);
      if (r.dcOffset > 0.05) failedRules.push(`${r.name}: high DC offset (${r.dcOffset.toFixed(4)})`);
    }

    if (similarPairs.length > 0) {
      md += `\n## Similar Sound Pairs\n\n`;
      for (const p of similarPairs) {
        md += `- **${p.soundA}** & **${p.soundB}** (spectral distance: ${p.distance.toFixed(3)}, dur diff: ${p.durationDiffMs.toFixed(1)}ms)\n`;
      }
    }

    fs.writeFileSync(mdPath, md);
    console.log(`Audit complete. Results written to ${jsonPath} and ${mdPath}`);

    if (failOnIdx >= 0) {
      if (failedRules.length > 0) {
        console.error(`Audit CI check failed (${failedRules.length} violation(s)):\n` + failedRules.map(f => `  - ${f}`).join('\n'));
        process.exit(1);
      } else {
        console.log('Audit CI check passed cleanly!');
      }
    }
    return;
  }

  if (cmd === 'random') {
    const archIdx = args.indexOf('--archetype');
    const countIdx = args.indexOf('--count');
    const seedIdx = args.indexOf('--seed');
    const outIdx = args.indexOf('--out');

    const rawArch = archIdx >= 0 ? args[archIdx + 1] : 'laser';
    const VALID_ARCHETYPES: SoundArchetype[] = [
      'laser',
      'explosion',
      'coin',
      'jump',
      'hit',
      'powerup',
      'ui_blip',
      'error',
    ];
    const archetype: SoundArchetype = VALID_ARCHETYPES.includes(rawArch as SoundArchetype)
      ? (rawArch as SoundArchetype)
      : 'laser';
    const count = countIdx >= 0 ? Number(args[countIdx + 1]) || 10 : 10;
    const seed = seedIdx >= 0 ? Number(args[seedIdx + 1]) || 1 : 1;
    const outDir = outIdx >= 0 ? args[outIdx + 1] : './random_sounds';

    const { randomRecipe } = await import('./design/generator.js');
    const { generateSet } = await import('./index.js');

    const recipes = [];
    for (let i = 0; i < count; i++) {
      recipes.push(randomRecipe({ archetype }, seed + i));
    }

    console.log(`Generating ${count} random "${archetype}" sound(s) starting from seed ${seed}…`);
    const files = await generateSet(recipes, { outDir, seed });
    console.log(`Wrote ${files.length} file(s) to ${outDir}`);
    return;
  }

  if (cmd !== 'generate') {
    console.log(`Usage:
  ask-generate generate --pack [options]
  ask-generate generate <recipe-file.js> [options]
  ask-generate preview <recipe-file.js> [options]
  ask-generate preview --pack --name <sfx> [options]

Flags for generate:
  --pack              Generate the full arcadePack()
  --out <dir>         Output directory (default: ./sounds)
  --seed <n>          Deterministic seed (default: 42)
  --variants <n>      Number of variants per recipe (default: 1)
  --sample-rate <n>   Offline sample rate (default: ${DEFAULT_SAMPLE_RATE})
  --bit-depth <16|32> WAV bit depth (default: 16 PCM)
  --arcade-color      Apply soft saturation for arcade colour
  --quiet             Suppress progress (only final summary)
  --verbose           Print full path of each written file

Flags for preview:
  --pack --name <sfx> Preview a specific sound from arcadePack()
  --seed <n>          Set seed for preview
  --sample-rate <n>   Set sample rate
  --variants <n>      Number of variants to preview
  --loop <n>          Repeat preview <n> times
  --gap <ms>          Silence gap between repeats in ms
  --watch             Watch recipe file and auto re-render on save
  --interactive       Interactive CLI control
`);
    process.exit(cmd ? 1 : 0);
  }

  const outIdx = args.indexOf('--out');
  const seedIdx = args.indexOf('--seed');
  const variantsIdx = args.indexOf('--variants');
  const sampleRateIdx = args.indexOf('--sample-rate');
  const bitDepthIdx = args.indexOf('--bit-depth');
  const outDir = outIdx >= 0 ? args[outIdx + 1] : './sounds';
  const seed = seedIdx >= 0 ? Number(args[seedIdx + 1]) : 42;
  const variants = variantsIdx >= 0 ? Number(args[variantsIdx + 1]) : 1;
  const sampleRate =
    sampleRateIdx >= 0 ? Number(args[sampleRateIdx + 1]) : DEFAULT_SAMPLE_RATE;
  const bitDepthRaw = bitDepthIdx >= 0 ? Number(args[bitDepthIdx + 1]) : 16;
  const bitDepth: 16 | 32 = bitDepthRaw === 32 ? 32 : 16;
  const arcadeColor = args.includes('--arcade-color');
  const quiet = args.includes('--quiet');
  const verbose = args.includes('--verbose');

  if (!Number.isFinite(sampleRate) || sampleRate < 8000) {
    console.error('Invalid --sample-rate (expected number >= 8000)');
    process.exit(1);
  }

  let recipes;
  if (args.includes('--pack')) {
    recipes = arcadePack();
    if (!quiet) {
      console.log(
        `Generating full arcade pack (${recipes.length} sounds) @ ${sampleRate} Hz PCM${bitDepth}…`
      );
    }
  } else {
    const file = args[1];
    if (!file || file.startsWith('--')) {
      console.error('Missing recipe file or --pack');
      process.exit(1);
    }
    const mod = await import(pathToFileURL(path.resolve(file)).href);
    recipes = mod.default ?? mod.recipes ?? mod;
    if (!Array.isArray(recipes)) {
      console.error('Recipe file must export an array of SoundRecipe');
      process.exit(1);
    }
    if (!quiet) {
      console.log(
        `Generating ${recipes.length} sound(s) from ${file} @ ${sampleRate} Hz PCM${bitDepth}…`
      );
    }
  }

  const isTTY = process.stdout.isTTY === true;
  let lastLineLen = 0;

  const onProgress = quiet
    ? undefined
    : (ev: GenerateProgressEvent) => {
        const line = renderProgressLine(ev, verbose);
        if (isTTY && !verbose) {
          const pad = Math.max(0, lastLineLen - line.length);
          process.stdout.write('\r' + line + ' '.repeat(pad));
          lastLineLen = line.length;
        } else if (ev.phase === 'done') {
          if (isTTY && lastLineLen > 0) {
            process.stdout.write('\r' + ' '.repeat(lastLineLen) + '\r');
            lastLineLen = 0;
          }
          console.log(line);
        }
      };

  const t0 = Date.now();
  const files = await generateSet(recipes, {
    outDir,
    seed,
    variants,
    sampleRate,
    bitDepth,
    arcadeColor,
    manifest: true,
    onProgress,
  });
  const elapsed = Date.now() - t0;

  if (!quiet && isTTY && lastLineLen > 0) {
    process.stdout.write('\n');
  }

  console.log(
    `Wrote ${files.length} file(s) to ${outDir} in ${formatMs(elapsed)} (${sampleRate} Hz, PCM${bitDepth})`
  );
  console.log(`Manifest: ${path.join(outDir, 'manifest.json')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
