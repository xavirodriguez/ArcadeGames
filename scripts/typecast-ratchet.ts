import { Project, SyntaxKind } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

/**
 * Script de Ratchet Linter para typecasts (`as any` / `as unknown`).
 *
 * Incluye todos los archivos `.ts` y `.tsx` del repositorio (incluyendo tests).
 * Justificación de incluir tests: Los tests son parte crítica del codebase y el uso desmedido
 * de `as any`/`as unknown` en tests oculta regresiones en la definición de tipos de las APIs del motor.
 */

const BASELINE_FILE = path.join(process.cwd(), "scripts", "typecast-baseline.json");
const isUpdateMode = process.argv.includes("--update");

// Performance optimization: skip adding files from tsconfig to avoid loading huge dependency trees
const project = new Project({
  skipAddingFilesFromTsConfig: true,
  compilerOptions: { allowJs: false }
});

// Target source files across packages, src, server, scripts
project.addSourceFilesAtPaths([
  "packages/**/*.ts",
  "packages/**/*.tsx",
  "src/**/*.ts",
  "src/**/*.tsx",
  "server/**/*.ts",
  "scripts/**/*.ts"
]);

interface FileTypecastCounts {
  anyCount: number;
  unknownCount: number;
  total: number;
}

type BaselineData = Record<string, FileTypecastCounts>;

const currentCounts: BaselineData = {};

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");

  // Skip node_modules, build outputs, and generated files
  if (
    relativePath.includes("node_modules") ||
    relativePath.includes("dist") ||
    relativePath.includes(".turbo") ||
    relativePath.includes("compiled-js")
  ) {
    continue;
  }

  let anyCount = 0;
  let unknownCount = 0;

  sourceFile.forEachDescendant((node) => {
    const typeNode =
      node.asKind(SyntaxKind.AsExpression)?.getTypeNode() ??
      node.asKind(SyntaxKind.TypeAssertionExpression)?.getTypeNode();
    if (!typeNode) return;

    const assertedType = typeNode.getText().trim();
    if (assertedType === "any") {
      anyCount++;
    } else if (assertedType === "unknown") {
      unknownCount++;
    }
  });

  if (anyCount > 0 || unknownCount > 0) {
    currentCounts[relativePath] = {
      anyCount,
      unknownCount,
      total: anyCount + unknownCount
    };
  }
}

// Ensure output is sorted alphabetically by file path for reproducible baseline JSON
const sortedCurrentCounts: BaselineData = {};
Object.keys(currentCounts)
  .sort()
  .forEach(key => {
    sortedCurrentCounts[key] = currentCounts[key];
  });

if (isUpdateMode) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(sortedCurrentCounts, null, 2) + "\n", "utf-8");
  console.log(`✅ Baseline versionado actualizado exitosamente en '${path.relative(process.cwd(), BASELINE_FILE)}'.`);
  console.log(`   Archivos catalogados con typecasts: ${Object.keys(sortedCurrentCounts).length}`);
  process.exit(0);
}

// Compare mode
if (!fs.existsSync(BASELINE_FILE)) {
  console.error(`❌ Baseline file not found: '${BASELINE_FILE}'.`);
  console.error(`   Run 'pnpm run ratchet:update' to generate the initial baseline.`);
  process.exit(1);
}

const baseline: BaselineData = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf-8"));

interface TypecastRegression {
  file: string;
  current: FileTypecastCounts;
  baselineAny: number;
  baselineUnknown: number;
  anyIncrease: number;
  unknownIncrease: number;
}

const regressions: TypecastRegression[] = [];
let totalProgressReductions = 0;

// Compare each assertion category independently. A reduction in one category
// must never mask a regression in the other.
for (const [file, current] of Object.entries(sortedCurrentCounts)) {
  const base = baseline[file];
  const baselineAny = base?.anyCount ?? 0;
  const baselineUnknown = base?.unknownCount ?? 0;
  const anyIncrease = Math.max(0, current.anyCount - baselineAny);
  const unknownIncrease = Math.max(0, current.unknownCount - baselineUnknown);

  if (anyIncrease > 0 || unknownIncrease > 0) {
    regressions.push({
      file,
      current,
      baselineAny,
      baselineUnknown,
      anyIncrease,
      unknownIncrease
    });
  }

  totalProgressReductions +=
    Math.max(0, baselineAny - current.anyCount) +
    Math.max(0, baselineUnknown - current.unknownCount);
}

// Inspect files in baseline that no longer have any type assertions.
for (const [file, base] of Object.entries(baseline)) {
  if (!sortedCurrentCounts[file]) {
    totalProgressReductions += base.anyCount + base.unknownCount;
  }
}

console.log(`🤖 Typecast Ratchet Linter Results ('as any' / 'as unknown')`);
console.log(`===========================================================`);

if (regressions.length > 0) {
  console.error(`❌ TYPECAST REGRESSION: ${regressions.length} file(s) exceeded an individual category baseline:\n`);
  for (const reg of regressions) {
    console.error(
      `  - ${reg.file}: as any=${reg.current.anyCount} (baseline ${reg.baselineAny}, +${reg.anyIncrease}); as unknown=${reg.current.unknownCount} (baseline ${reg.baselineUnknown}, +${reg.unknownIncrease})`
    );
  }
  console.error(`\nRemove the new assertions or update the baseline only with an evidenced debt reduction.`);
  process.exit(1);
}

console.log(`✅ Ratchet verification passed! No file increased either 'as any' or 'as unknown' independently.`);
if (totalProgressReductions > 0) {
  console.log(
    `🎉 ¡Progreso detectado! Se redujeron ${totalProgressReductions} typecasts existentes respecto al baseline.`
  );
  console.log(`   Ejecuta 'pnpm run ratchet:update' para actualizar el baseline y consolidar el avance.`);
}

process.exit(0);
