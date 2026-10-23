#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import {
  arcadePack,
  generateSet,
  GenerateProgressEvent,
  DEFAULT_SAMPLE_RATE,
} from './index';

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

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd !== 'generate') {
    console.log(`Usage:
  ask-generate generate --pack [options]
  ask-generate generate <recipe-file.js> [options]

Flags:
  --pack              Generate the full arcadePack()
  --out <dir>         Output directory (default: ./sounds)
  --seed <n>          Deterministic seed (default: 42)
  --variants <n>      Number of variants per recipe (default: 1)
  --sample-rate <n>   Offline sample rate (default: ${DEFAULT_SAMPLE_RATE})
  --bit-depth <16|32> WAV bit depth (default: 16 PCM)
  --arcade-color      Apply soft saturation for arcade colour
  --quiet             Suppress progress (only final summary)
  --verbose           Print full path of each written file

Examples:
  ask-generate generate --pack
  ask-generate generate --pack --sample-rate 44100 --bit-depth 32
  ask-generate generate --pack --out ./sounds --arcade-color
  ask-generate generate examples/arcade.js --out ./custom-sounds
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
