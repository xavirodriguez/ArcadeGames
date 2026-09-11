#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { arcadePack, generateSet } from './index';

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd !== 'generate') {
    console.log(`Usage:
  ask-generate generate --pack [--out ./sounds] [--seed 42] [--variants 1] [--arcade-color]
  ask-generate generate <recipe-file.js> [--out ./sounds] [--seed 42]

Examples:
  ask-generate generate --pack
  ask-generate generate examples/arcade.js --out ./custom-sounds
`);
    process.exit(cmd ? 1 : 0);
  }

  const outIdx = args.indexOf('--out');
  const seedIdx = args.indexOf('--seed');
  const variantsIdx = args.indexOf('--variants');
  const outDir = outIdx >= 0 ? args[outIdx + 1] : './sounds';
  const seed = seedIdx >= 0 ? Number(args[seedIdx + 1]) : 42;
  const variants = variantsIdx >= 0 ? Number(args[variantsIdx + 1]) : 1;
  const arcadeColor = args.includes('--arcade-color');

  let recipes;
  if (args.includes('--pack')) {
    recipes = arcadePack();
    console.log(`Generating full arcade pack (${recipes.length} sounds)…`);
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
  }

  const files = await generateSet(recipes, {
    outDir,
    seed,
    variants,
    arcadeColor,
    manifest: true,
  });

  console.log(`Wrote ${files.length} file(s) to ${outDir}`);
  console.log(`Manifest: ${path.join(outDir, 'manifest.json')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
