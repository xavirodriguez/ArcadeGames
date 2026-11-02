#!/usr/bin/env tsx
/**
 * ensure-branding.ts — placeholders de iconos por juego bajo src/games/<id>/branding/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const GAME_IDS = [
  "arkanoid", "asteroids", "centipede", "echorunner", "flappybird", "frogger",
  "galaxian", "geometrywars", "hitandrun", "outrun", "platformer", "pong",
  "racing", "space-invaders", "tower-defense", "vertical-shmup",
  "campaign", "cyoa", "blindstation",
] as const;

const SOURCE = {
  icon: path.join(ROOT, "public/images/icon.png"),
  adaptive: path.join(ROOT, "public/images/adaptive-icon.png"),
  splash: path.join(ROOT, "public/images/splash-icon.png"),
  favicon: path.join(ROOT, "public/images/favicon.png"),
};

const SOURCE_ALT = {
  icon: path.join(ROOT, "assets/icon.png"),
  adaptive: path.join(ROOT, "assets/icon.png"),
  splash: path.join(ROOT, "assets/splash.png"),
  favicon: path.join(ROOT, "assets/favicon.png"),
};

function pickSource(key: keyof typeof SOURCE): string | null {
  if (fs.existsSync(SOURCE[key])) return SOURCE[key];
  if (fs.existsSync(SOURCE_ALT[key])) return SOURCE_ALT[key];
  return null;
}

function ensureGame(id: string) {
  const dir = path.join(ROOT, "src/games", id, "branding");
  fs.mkdirSync(dir, { recursive: true });
  const targets = [
    { key: "icon" as const, file: "icon.png" },
    { key: "adaptive" as const, file: "adaptive-icon.png" },
    { key: "splash" as const, file: "splash.png" },
    { key: "favicon" as const, file: "favicon.png" },
  ];
  for (const t of targets) {
    const dest = path.join(dir, t.file);
    if (fs.existsSync(dest)) continue;
    const src = pickSource(t.key);
    if (!src) {
      console.warn(`  ⚠ sin fuente para ${t.file} (${id})`);
      continue;
    }
    fs.copyFileSync(src, dest);
    console.log(`  + ${path.relative(ROOT, dest)}`);
  }
}

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const ids = args.length > 0 ? args : [...GAME_IDS];
  console.log("ensure-branding");
  for (const id of ids) {
    console.log(`→ ${id}`);
    ensureGame(id);
  }
  console.log("done");
}

main();
