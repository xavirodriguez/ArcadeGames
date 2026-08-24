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

  sourceFile.forEachDescendant(node => {
    const kind = node.getKind();
    if (kind === SyntaxKind.AsExpression || kind === SyntaxKind.TypeAssertionExpression) {
      // Get the target type node text
      const typeNode = (node as any).getTypeNode?.();
      if (typeNode) {
        const text = typeNode.getText().trim();
        if (text === "any") {
          anyCount++;
        } else if (text === "unknown") {
          unknownCount++;
        }
      }
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

const regressions: Array<{
  file: string;
  current: FileTypecastCounts;
  baselineTotal: number;
  increase: number;
}> = [];

let totalProgressReductions = 0;

// Inspect current files against baseline
for (const [file, current] of Object.entries(sortedCurrentCounts)) {
  const baseTotal = baseline[file] ? baseline[file].total : 0;
  if (current.total > baseTotal) {
    regressions.push({
      file,
      current,
      baselineTotal: baseTotal,
      increase: current.total - baseTotal
    });
  } else if (current.total < baseTotal) {
    totalProgressReductions += baseTotal - current.total;
  }
}

// Inspect files in baseline that no longer have any typecasts
for (const [file, base] of Object.entries(baseline)) {
  if (!sortedCurrentCounts[file]) {
    totalProgressReductions += base.total;
  }
}

console.log(`🤖 Typecast Ratchet Linter Results ('as any' / 'as unknown')`);
console.log(`===========================================================`);

if (regressions.length > 0) {
  console.error(`❌ REGRESION DE TIPADO DETECTADA: ${regressions.length} archivo(s) incrementaron 'as any' / 'as unknown':\n`);
  for (const reg of regressions) {
    console.error(
      `  - ${reg.file}: actual=${reg.current.total} (any: ${reg.current.anyCount}, unknown: ${reg.current.unknownCount}) vs baseline=${reg.baselineTotal} (+${reg.increase} nuevos)`
    );
  }
  console.error(`\nFavor de remover los nuevos typecasts e inferir/tipar adecuadamente.`);
  process.exit(1);
}

console.log(`✅ Ratchet verification passed! Ningún archivo incrementó 'as any' / 'as unknown'.`);
if (totalProgressReductions > 0) {
  console.log(
    `🎉 ¡Progreso detectado! Se redujeron ${totalProgressReductions} typecasts existentes respecto al baseline.`
  );
  console.log(`   Ejecuta 'pnpm run ratchet:update' para actualizar el baseline y consolidar el avance.`);
}

process.exit(0);
