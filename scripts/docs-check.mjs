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

const [
  readme,
  manifest,
  appManifest,
  appConfigSource,
  identityDoc,
  ratchetPolicy,
  agentsGuide,
  operatingContract,
  wiki,
  typecastBaseline,
  duplicationBaseline,
  colorBaseline,
  gameEntries,
  packageEntries,
] = await Promise.all([
  readFile(path.join(rootDir, "README.md"), "utf8"),
  readJson("package.json"),
  readJson("app.json"),
  readFile(path.join(rootDir, "app.config.ts"), "utf8"),
  readFile(path.join(rootDir, "docs/PROJECT_IDENTITY_AND_NAMING.md"), "utf8"),
  readFile(path.join(rootDir, "docs/TECHNICAL_DEBT_RATCHETS.md"), "utf8"),
  readFile(path.join(rootDir, "AGENTS.md"), "utf8"),
  readFile(path.join(rootDir, "docs/agents/OPERATING_CONTRACT.md"), "utf8"),
  readJson(".devin/wiki.json"),
  readJson("scripts/typecast-baseline.json"),
  readJson("scripts/duplication-baseline.json"),
  readJson("scripts/color-literals-baseline.json"),
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
const rootExpoConfig = appManifest.expo;
const wikiOverview = wiki.pages.find((page) => page.title === "Project Overview");
const wikiGameImplementations = wiki.pages.find((page) => page.title === "Game Implementations");
const typecastTotals = Object.values(typecastBaseline).reduce(
  (totals, file) => ({
    any: totals.any + file.anyCount,
    unknown: totals.unknown + file.unknownCount,
    total: totals.total + file.total,
  }),
  { any: 0, unknown: 0, total: 0 },
);

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
if (!manifest.scripts["architecture:check"] || manifest.scripts.arquitecture) {
  failures.push("Use architecture:check as the only canonical architecture-analysis script.");
}
if (manifest.scripts["validate:story"]) {
  failures.push("story:lint is the canonical story validation script; remove the redundant validate:story alias.");
}

// Workspace package names must match their directory and the @tiny-aster scope.
if (!manifest.private || manifest.name !== "asteroides") {
  failures.push("The root workspace must remain private and retain its documented legacy name 'asteroides'.");
}
if (!manifest.description?.includes("Tiny Aster")) {
  failures.push("The private root workspace description must identify the Tiny Aster project.");
}
for (const packageName of packages) {
  try {
    const packageManifest = await readJson(`packages/${packageName}/package.json`);
    if (packageManifest.name !== `@tiny-aster/${packageName}`) {
      failures.push(`packages/${packageName}/package.json must use @tiny-aster/${packageName}.`);
    }
  } catch {
    // The missing manifest is reported by the package inventory check above.
  }
}

if (
  !identityDoc.includes(`\`${manifest.name}\``) ||
  !identityDoc.includes(`\`${rootExpoConfig.name}\``) ||
  !identityDoc.includes(`\`${rootExpoConfig.slug}\``) ||
  !identityDoc.includes(`\`${rootExpoConfig.scheme}\``) ||
  !identityDoc.includes(`\`${rootExpoConfig.ios.bundleIdentifier}\``) ||
  !identityDoc.includes(`\`${rootExpoConfig.android.package}\`)
) {
  failures.push("The project identity document does not record the current root package and Expo/native identifiers.");
}
for (const configValue of [
  `name: "${rootExpoConfig.name}"`,
  `slug: "${rootExpoConfig.slug}"`,
  `scheme: "${rootExpoConfig.scheme}"`,
  `bundleIdentifier: "${rootExpoConfig.ios.bundleIdentifier}"`,
  `package: "${rootExpoConfig.android.package}"`,
]) {
  if (!appConfigSource.includes(configValue)) {
    failures.push(`app.config.ts is out of sync with app.json for ${configValue}.`);
  }
}
if (!readme.includes("[project identity and naming contract](docs/PROJECT_IDENTITY_AND_NAMING.md)")) {
  failures.push("README must link to the project identity and naming contract.");
}
if (
  !agentsGuide.includes("docs/PROJECT_IDENTITY_AND_NAMING.md") ||
  !operatingContract.includes("../PROJECT_IDENTITY_AND_NAMING.md")
) {
  failures.push("AGENTS.md and the operating contract must point to the canonical naming policy.");
}
if (
  !wikiOverview?.purpose.includes(`${games.length} game-module directories`) ||
  !wikiGameImplementations?.purpose.includes(`${games.length} game-module directories`)
) {
  failures.push(`.devin/wiki.json must describe the current ${games.length} game-module directories without stale fixed counts.`);
}

// Baseline metrics in this policy must match the committed measurement files.
const baselineChecks = [
  [`| \`as any\` type assertions | ${typecastTotals.any} |`, "as any baseline"],
  [`| \`as unknown\` type assertions | ${typecastTotals.unknown} |`, "as unknown baseline"],
  [`| Total \`as any\` / \`as unknown\` assertions | ${typecastTotals.total} |`, "total type assertion baseline"],
  [`| Duplicated lines | ${duplicationBaseline.duplicatedLines.toLocaleString("en-US")} |`, "duplication baseline"],
  [`| Duplication ratio | ${duplicationBaseline.percentage}% |`, "duplication ratio baseline"],
  [`| Color-literal occurrences | ${colorBaseline.count} |`, "color literal baseline"],
];
for (const [expected, label] of baselineChecks) {
  if (!ratchetPolicy.includes(expected)) failures.push(`Technical-debt policy is stale: ${label}.`);
}

const tenPercentTarget = (value) => Math.floor(value * 0.9);
const requiredTargets = [
  [`| Total \`as any\` / \`as unknown\` assertions | ${typecastTotals.total} | **${tenPercentTarget(typecastTotals.total)} or fewer** |`, "type-assertion reduction target"],
  [`| Duplicated lines | ${duplicationBaseline.duplicatedLines.toLocaleString("en-US")} | **${tenPercentTarget(duplicationBaseline.duplicatedLines).toLocaleString("en-US")} or fewer** |`, "duplication reduction target"],
  [`| Color-literal occurrences | ${colorBaseline.count} | **${tenPercentTarget(colorBaseline.count)} or fewer** |`, "color-literal reduction target"],
];
for (const [expected, label] of requiredTargets) {
  if (!ratchetPolicy.includes(expected)) failures.push(`Technical-debt policy target is stale: ${label}.`);
}
if (!ratchetPolicy.includes("| Duplication ratio | 1.57% | **1.50% or lower** |")) {
  failures.push("Technical-debt policy must retain the 1.50% duplication-ratio target.");
}

const gameIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
for (const gameId of games) {
  if (!gameIdPattern.test(gameId)) {
    failures.push(`Game directory ID is not lowercase kebab-case/single-word: ${gameId}.`);
  }
}
for (const legacyGameId of ["echorunner", "flappybird", "geometrywars", "hitandrun"]) {
  if (games.includes(legacyGameId) && !identityDoc.includes(`\`${legacyGameId}\``)) {
    failures.push(`The naming policy must preserve and list the legacy game ID ${legacyGameId}.`);
  }
}
if (
  !identityDoc.includes("Tiny Aster") ||
  !identityDoc.includes("ArcadeGames") ||
  !identityDoc.includes("@tiny-aster")
) {
  failures.push("The naming policy must distinguish the Tiny Aster brand, ArcadeGames repository and @tiny-aster package scope.");
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

for (const scriptName of ["test", "lint", "test:ci", "test:games:ci", "test:e2e", "sprites:build", "sprites:validate", "typecheck:core", "typecheck:app", "architecture:check"]) {
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
