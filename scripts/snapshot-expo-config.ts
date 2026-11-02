#!/usr/bin/env tsx
/**
 * snapshot-expo-config.ts
 * Ejecuta `npx expo config --json` por juego y guarda snapshots.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "docs", "single-game-apps", "config-snapshots");

const ALL_IDS = [
  "arkanoid", "asteroids", "centipede", "echorunner", "flappybird", "frogger",
  "galaxian", "geometrywars", "hitandrun", "outrun", "platformer", "pong",
  "racing", "space-invaders", "tower-defense", "vertical-shmup",
  "campaign", "cyoa", "blindstation",
] as const;

function runExpoConfig(gameId: string | null): unknown {
  const env = { ...process.env } as NodeJS.ProcessEnv;
  if (gameId) env.EXPO_PUBLIC_GAME_ID = gameId;
  else delete env.EXPO_PUBLIC_GAME_ID;

  const out = execSync("npx expo config --type public --json", {
    cwd: ROOT,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out);
}

function pickRelevant(cfg: Record<string, unknown>) {
  return {
    name: cfg.name,
    slug: cfg.slug,
    scheme: cfg.scheme,
    orientation: cfg.orientation,
    icon: cfg.icon,
    ios: cfg.ios,
    android: cfg.android,
    plugins: cfg.plugins,
    extra: cfg.extra,
  };
}

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const ids: (string | null)[] = args.length > 0 ? args : [null, ...ALL_IDS];

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const summary: { id: string; name?: string; package?: string }[] = [];

  for (const id of ids) {
    const label = id ?? "arcade";
    process.stdout.write(`→ ${label} ... `);
    try {
      const raw = runExpoConfig(id) as Record<string, unknown>;
      const relevant = pickRelevant(raw);
      fs.writeFileSync(
        path.join(OUT_DIR, `${label}.json`),
        JSON.stringify(relevant, null, 2) + "\n",
        "utf8"
      );
      const android = relevant.android as { package?: string } | undefined;
      summary.push({ id: label, name: relevant.name as string, package: android?.package });
      console.log("ok");
    } catch (err) {
      console.log("FAIL");
      console.error(err);
      process.exitCode = 1;
    }
  }

  const lines = [
    "# Expo config snapshots",
    "",
    "| id | name | android.package |",
    "|----|------|-----------------|",
    ...summary.map((s) => `| ${s.id} | ${s.name ?? "—"} | \`${s.package ?? "—"}\` |`),
    "",
    `Generado: ${new Date().toISOString()}`,
    "",
  ];
  fs.writeFileSync(path.join(OUT_DIR, "INDEX.md"), lines.join("\n"), "utf8");
  console.log(`\n✅ Snapshots en ${path.relative(ROOT, OUT_DIR)}`);
}

main();
