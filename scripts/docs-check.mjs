import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), "utf8"));
}

function sectionBetween(markdown, startHeading, endHeading) {
  const start = markdown.indexOf(startHeading);
  if (start < 0) return "";
  const contentStart = start + startHeading.length;
  const end = endHeading
    ? markdown.indexOf(endHeading, contentStart)
    : markdown.length;
  return markdown.slice(contentStart, end < 0 ? markdown.length : end);
}

const [readme, manifest, gameEntries, packageEntries] = await Promise.all([
  readFile(path.join(rootDir, "README.md"), "utf8"),
  readJson("package.json"),
  readdir(path.join(rootDir, "src/games"), { withFileTypes: true }),
  readdir(path.join(rootDir, "packages"), { withFileTypes: true }),
]);

const failures = [];
const games = gameEntries
  .filter((entry) => entry.isDirectory() && entry.name !== "shared")
  .map((entry) => entry.name)
  .sort();
const packages = packageEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const gamesSection = sectionBetween(readme, "## 🎮 Games included", "## 🚀 Quick Start");
const layoutSection = sectionBetween(readme, "### Monorepo layout", "## ✨ Engine Features");
const qualitySection = sectionBetween(readme, "## 🧪 Quality gates", "## 📜 License");

if (!gamesSection) failures.push("README is missing the 'Games included' section.");
if (!layoutSection) failures.push("README is missing the 'Monorepo layout' section.");
if (!qualitySection) failures.push("README is missing the 'Quality gates' section.");

if (!gamesSection.includes(`**${games.length} game modules**`)) {
  failures.push(`README game-module count does not match src/games/ (${games.length}).`);
}
for (const game of games) {
  if (!gamesSection.includes(`src/games/${game}`)) {
    failures.push(`README does not list game module src/games/${game}.`);
  }
}

if (!layoutSection.includes(`**${packages.length} workspace packages**`)) {
  failures.push(`README package count does not match packages/ (${packages.length}).`);
}
for (const packageName of packages) {
  const packagePath = `packages/${packageName}`;
  if (!layoutSection.includes(packagePath)) {
    failures.push(`README monorepo layout does not list ${packagePath}.`);
  }
  try {
    await readJson(`${packagePath}/package.json`);
  } catch {
    failures.push(`${packagePath} has no readable package.json.`);
  }
}

if (manifest.scripts["docs:check"] !== "node scripts/docs-check.mjs") {
  failures.push("docs:check must run scripts/docs-check.mjs; API extraction belongs to docs:extract.");
}

const requiredScriptNames = new Set();
for (const key of ["ci", "check:agent-guardrails"]) {
  const command = manifest.scripts[key];
  if (!command) {
    failures.push(`package.json is missing the ${key} script.`);
    continue;
  }
  for (const match of command.matchAll(/pnpm run ([a-zA-Z0-9:_-]+)/g)) {
    requiredScriptNames.add(match[1]);
  }
}
for (const scriptName of requiredScriptNames) {
  if (!qualitySection.includes(`pnpm run ${scriptName}`)) {
    failures.push(`README Quality gates does not document pnpm run ${scriptName}.`);
  }
}

for (const scriptName of ["test", "lint", "test:ci", "test:games:ci", "test:e2e", "sprites:build", "sprites:validate", "typecheck:core", "typecheck:app"]) {
  if (!manifest.scripts[scriptName]) {
    failures.push(`README documents a missing root script: ${scriptName}.`);
  }
}
for (const command of [
  "pnpm --filter=@tiny-aster/gameplay-kit build",
  "pnpm run docs:extract",
  "pnpm docs:build",
]) {
  if (!qualitySection.includes(command)) {
    failures.push(`README Quality gates does not document ${command}.`);
  }
}

if (failures.length > 0) {
  console.error("Documentation consistency check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Documentation consistency check passed: ${games.length} game modules, ${packages.length} workspace packages, and CI quality-gate references verified.`,
  );
}
