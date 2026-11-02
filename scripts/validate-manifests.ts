#!/usr/bin/env tsx
/**
 * validate-manifests.ts
 * Comprueba unicidad y validez de ids, slugs, schemes y packages.
 * Android package: solo [a-z0-9.] (sin guiones).
 */
import { getAllManifests, GAME_IDS, type GameManifest } from "../src/manifests/manifests";

const ANDROID_PACKAGE_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const SCHEME_RE = /^[a-z][a-z0-9+.-]*$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function checkUnique(field: string, values: string[]) {
  const seen = new Map<string, number>();
  for (const v of values) {
    if (seen.has(v)) fail(`Duplicado en ${field}: "${v}"`);
    seen.set(v, 1);
  }
}

function main() {
  const manifests = getAllManifests();
  if (manifests.length === 0) fail("No hay manifests");

  const ids = new Set(manifests.map((m) => m.id));
  for (const id of GAME_IDS) {
    if (!ids.has(id)) fail(`Falta manifest para GameId "${id}"`);
  }

  checkUnique("id", manifests.map((m) => m.id));
  checkUnique("slug", manifests.map((m) => m.slug));
  checkUnique("scheme", manifests.map((m) => m.scheme));
  checkUnique("android.package", manifests.map((m) => m.android.package));
  checkUnique("ios.bundleIdentifier", manifests.map((m) => m.ios.bundleIdentifier));

  for (const m of manifests) {
    if (!SLUG_RE.test(m.slug)) fail(`${m.id}: slug inválido "${m.slug}"`);
    if (!SCHEME_RE.test(m.scheme)) fail(`${m.id}: scheme inválido "${m.scheme}"`);
    if (!ANDROID_PACKAGE_RE.test(m.android.package) || m.android.package.includes("-"))
      fail(`${m.id}: android.package inválido "${m.android.package}"`);
    if (!m.name?.trim()) fail(`${m.id}: name vacío`);
    if (!["portrait", "landscape", "default"].includes(m.orientation))
      fail(`${m.id}: orientation inválida`);
    if (!m.icons?.icon) fail(`${m.id}: falta icons.icon`);
  }

  console.log(`✅ ${manifests.length} manifests válidos y únicos.`);
}

main();
