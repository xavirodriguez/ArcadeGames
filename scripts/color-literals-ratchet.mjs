#!/usr/bin/env node
/**
 * Color-literals ratchet. Prohibits hex/rgb outside src/theme and allowlist.
 * Baseline pattern like jscpd. pnpm run colors:update-baseline / check:color-literals.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASELINE_FILE = path.join(ROOT, "scripts", "color-literals-baseline.json");
const isUpdate = process.argv.includes("--update");
export const PROPOSED_ALLOWLIST = [
  { path: "src/games/outrun/config/visualDefaults.ts", reason: "OutRun visual defaults" },
  { path: "src/games/racing/rendering/RacingPalette.ts", reason: "Racing palette" },
  { path: "src/games/frogger/rendering/FroggerVisualTokens.ts", reason: "Frogger tokens" },
  { path: "src/games/centipede/types/CentipedeConfigSchema.ts", reason: "Centipede schema" },
  { path: "src/games/centipede/rendering/CentipedeCanvasVisuals.ts", reason: "Centipede canvas" },
  { path: "src/games/centipede/rendering/CentipedeSkiaVisuals.ts", reason: "Centipede skia" },
  { path: "src/games/centipede/rendering/CentipedeVisualTokens.ts", reason: "Centipede tokens" },
  { path: "src/games/tower-defense/rendering/TowerDefenseCanvasVisuals.ts", reason: "TD canvas" },
  { path: "src/games/tower-defense/rendering/TowerDefenseSkiaVisuals.ts", reason: "TD skia" },
  { path: "src/games/tower-defense/presentation/TowerDefenseVisualTokens.ts", reason: "TD tokens" },
  { path: "src/games/echorunner/rendering/EchoRunnerPalette.ts", reason: "Echo Runner palette" },
  { path: "src/games/vertical-shmup/rendering/ShmupColorTokens.ts", reason: "Shmup tokens" },
  { path: "src/games/vertical-shmup/rendering/ShmupVisualHelpers.ts", reason: "Shmup helpers" },
  { path: "src/games/flappybird/mods/officePaper/OfficePaperCanvasVisuals.ts", reason: "Flappy office canvas" },
  { path: "src/games/flappybird/mods/officePaper/OfficePaperSkiaVisuals.ts", reason: "Flappy office skia" },
  { path: "src/games/hitandrun/fantasy/FantasyPalette.ts", reason: "Hit&Run fantasy" },
  { path: "src/games/hitandrun/rendering/HitAndRunPalette.ts", reason: "Hit&Run palette" },
  { path: "src/games/hitandrun/rendering/HitRunCanvasVisuals.ts", reason: "Hit&Run canvas" },
  { path: "src/games/hitandrun/rendering/HitRunPlaceholderVisuals.ts", reason: "Hit&Run placeholders" },
  { path: "src/games/hitandrun/rendering/theme/sumi-e/SumiETheme.ts", reason: "SumiETheme live" },
  { path: "src/games/asteroids/mods/iceberg/IcebergPalette.ts", reason: "Iceberg palette" },
  { path: "src/games/shared/procedural/colors/ProceduralPalettes.ts", reason: "Procedural palettes" },
  { path: "src/games/shared/rendering/sumi-e/SumiEPalette.ts", reason: "Shared SumiE palette" },
  { path: "src/games/space-invaders/config/EnemyBlueprints.ts", reason: "SI enemy blueprints" },
  { path: "src/games/space-invaders/systems/ComboHUDRenderSystem.ts", reason: "SI combo HUD" },
  { path: "src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts", reason: "SI collisions" },
  { path: "src/games/space-invaders/systems/BossSystem.ts", reason: "SI boss" },
  { path: "src/games/arkanoid/systems/ArkanoidCollisionSystem.ts", reason: "Arkanoid collisions" },
  { path: "src/theme/conceptPacks/aquiHayDragonesConceptPack.ts", reason: "Aqui hay dragones pack" },
  { path: "src/theme/conceptPacks/inkWorldEchoRunnerConceptPack.ts", reason: "inkWorld Echo pack" },
  { path: "src/theme/conceptPacks/paperDuskConceptPack.ts", reason: "paperDusk pack" },
  { path: "src/theme/conceptPacks/siegeShieldWallConceptPack.ts", reason: "siege pack" },
  { path: "src/theme/conceptPacks/ww2DogfightConceptPack.ts", reason: "WW2 pack" },
  { path: "src/theme/conceptPacks/zombieSurvivalConceptPack.ts", reason: "zombie pack" },
  { path: "src/components/debug/DebugOverlay.tsx", reason: "Debug overlay" },
  { path: "src/components/GameErrorBoundary.tsx", reason: "Error boundary" },
  { path: "src/app/sound-lab/index.tsx", reason: "Sound lab" },
  { path: "src/ui/narrative/NarrativeDashboard.tsx", reason: "Narrative dashboard" },
  { path: "src/services/PaletteService.ts", reason: "Palette service" },
  { path: "src/story-ui/config/evidenceConfig.ts", reason: "Evidence config" },
  { path: "src/app/echorunner/index.tsx", reason: "Echo shell" },
  { path: "src/app/frogger/index.tsx", reason: "Frogger shell" },
  { path: "src/app/vertical-shmup/index.tsx", reason: "Shmup shell" },
  { path: "src/app/flappybird/index.tsx", reason: "Flappy shell" },
  { path: "src/app/racing/index.tsx", reason: "Racing shell" },
  { path: "src/app/outrun/index.tsx", reason: "OutRun shell" },
  { path: "src/app/tower-defense/index.tsx", reason: "TD shell" },
];
const ALLOWED_PREFIXES = ["src/theme/"];
const HEX_RE = /#([0-9a-fA-F]{3,8})\b/g;
const RGB_RE = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/gi;
function isAllowed(relPath) {
  const norm = relPath.replace(/\\/g, "/");
  if (ALLOWED_PREFIXES.some((p) => norm.startsWith(p))) return true;
  if (norm.includes("/theme/") && norm.startsWith("packages/")) return true;
  return PROPOSED_ALLOWLIST.some((e) => e.path === norm);
}
function findFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules","dist",".git","test","__tests__","tests","coverage"].includes(e.name)) continue;
      findFiles(full, results);
    } else if (/\.(ts|tsx|js|jsx)$/.test(e.name) && !e.name.includes(".test.") && !e.name.includes(".spec.")) results.push(full);
  }
  return results;
}
function scan() {
  const roots = [path.join(ROOT,"src"), path.join(ROOT,"components")];
  const packagesDir = path.join(ROOT,"packages");
  if (fs.existsSync(packagesDir)) for (const pkg of fs.readdirSync(packagesDir)) {
    const src = path.join(packagesDir, pkg, "src");
    if (fs.existsSync(src)) roots.push(src);
  }
  const hits = [];
  for (const file of roots.flatMap((d) => findFiles(d))) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (isAllowed(rel)) continue;
    let content; try { content = fs.readFileSync(file,"utf8"); } catch { continue; }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i], t = line.trim();
      if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) continue;
      HEX_RE.lastIndex = 0; let m;
      while ((m = HEX_RE.exec(line))) hits.push({ file: rel, line: i+1, raw: m[0] });
      RGB_RE.lastIndex = 0;
      while ((m = RGB_RE.exec(line))) hits.push({ file: rel, line: i+1, raw: m[0] });
    }
  }
  return hits;
}
function keyOf(h) { return `${h.file}:${h.line}:${h.raw.toLowerCase()}`; }
function main() {
  const hits = scan();
  const currentKeys = new Set(hits.map(keyOf));
  if (isUpdate) {
    const baseline = { generatedAt: new Date().toISOString(), count: hits.length, keys: [...currentKeys].sort(), byFile: {} };
    for (const h of hits) baseline.byFile[h.file] = (baseline.byFile[h.file]||0)+1;
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2)+"\n");
    console.log(`Updated baseline: ${hits.length}`);
    process.exit(0);
  }
  if (!fs.existsSync(BASELINE_FILE)) { console.error("No baseline. Run colors:update-baseline"); process.exit(1); }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE,"utf8"));
  const baselineKeys = new Set(baseline.keys||[]);
  const newHits = hits.filter((h) => !baselineKeys.has(keyOf(h)));
  console.log(`Color literals: ${hits.length} (baseline ${baseline.count})`);
  if (newHits.length) {
    for (const h of newHits.slice(0,40)) console.error(`  ${h.file}:${h.line} ${h.raw}`);
    process.exit(1);
  }
  console.log("OK");
  process.exit(0);
}
main();
