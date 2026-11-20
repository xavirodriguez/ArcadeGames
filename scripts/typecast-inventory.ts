import { Project, SyntaxKind } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

/**
 * F0 — Inventario reproducible de typecasts (`as any` / `as unknown`).
 *
 * Clasifica por área (producción / tests / scripts) y por paquete, usando AST
 * (ts-morph), con las mismas reglas de exclusión que `typecast-ratchet.ts`.
 *
 * Uso:
 *   pnpm exec tsx scripts/typecast-inventory.ts            # imprime resumen
 *   pnpm exec tsx scripts/typecast-inventory.ts --json     # escribe docs/typecast-inventory.json
 */

const isJson = process.argv.includes("--json");
const project = new Project({
  skipAddingFilesFromTsConfig: true,
  compilerOptions: { allowJs: false }
});

project.addSourceFilesAtPaths([
  "packages/**/*.ts",
  "packages/**/*.tsx",
  "src/**/*.ts",
  "src/**/*.tsx",
  "server/**/*.ts",
  "scripts/**/*.ts"
]);

type Area = "production" | "tests" | "scripts";
type Counts = { anyCount: number; unknownCount: number; total: number };

function classifyArea(rel: string): Area | null {
  if (
    rel.includes("node_modules") ||
    rel.includes("/dist/") ||
    rel.includes("\\dist\\") ||
    rel.includes(".turbo") ||
    rel.includes("compiled-js") ||
    rel.endsWith(".d.ts")
  ) {
    return null;
  }
  if (rel.startsWith("scripts/")) return "scripts";
  if (
    rel.includes("/__tests__/") ||
    rel.includes("\\__tests__\\") ||
    rel.includes("/tests/") ||
    rel.includes("\\tests\\") ||
    /\.test\.(ts|tsx)$/.test(rel) ||
    /\.spec\.(ts|tsx)$/.test(rel)
  ) {
    return "tests";
  }
  return "production";
}

function pkgOf(rel: string): string {
  if (rel.startsWith("packages/")) {
    const parts = rel.split("/");
    return `${parts[0]}/${parts[1]}`;
  }
  if (rel.startsWith("src/")) return "app/src";
  if (rel.startsWith("server/")) return "server";
  if (rel.startsWith("scripts/")) return "scripts";
  return "other";
}

const byArea: Record<Area, Counts> = {
  production: { anyCount: 0, unknownCount: 0, total: 0 },
  tests: { anyCount: 0, unknownCount: 0, total: 0 },
  scripts: { anyCount: 0, unknownCount: 0, total: 0 }
};
const byPackage: Record<string, Record<Area, Counts>> = {};
const fileRows: Array<{ file: string; area: Area; pkg: string; anyCount: number; unknownCount: number; total: number }> = [];

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, "/");

  const area = classifyArea(rel);
  if (!area) continue;

  let anyCount = 0;
  let unknownCount = 0;

  sourceFile.forEachDescendant((node) => {
    const typeNode =
      node.asKind(SyntaxKind.AsExpression)?.getTypeNode() ??
      node.asKind(SyntaxKind.TypeAssertionExpression)?.getTypeNode();
    if (!typeNode) return;
    const assertedType = typeNode.getText().trim();
    if (assertedType === "any") anyCount++;
    else if (assertedType === "unknown") unknownCount++;
  });

  if (anyCount === 0 && unknownCount === 0) continue;

  const pkg = pkgOf(rel);
  const row = { file: rel, area, pkg, anyCount, unknownCount, total: anyCount + unknownCount };
  fileRows.push(row);

  byArea[area].anyCount += anyCount;
  byArea[area].unknownCount += unknownCount;
  byArea[area].total += anyCount + unknownCount;

  byPackage[pkg] ??= {
    production: { anyCount: 0, unknownCount: 0, total: 0 },
    tests: { anyCount: 0, unknownCount: 0, total: 0 },
    scripts: { anyCount: 0, unknownCount: 0, total: 0 }
  };
  byPackage[pkg][area].anyCount += anyCount;
  byPackage[pkg][area].unknownCount += unknownCount;
  byPackage[pkg][area].total += anyCount + unknownCount;
}

fileRows.sort((a, b) => b.total - a.total);

const result = {
  generatedAt: new Date().toISOString(),
  scope: "packages/**/*.ts(x), src/**/*.ts(x), server/**/*.ts, scripts/**/*.ts (excl. dist/.turbo/compiled-js/*.d.ts)",
  method: "ts-morph AST, AsExpression/TypeAssertionExpression with type node 'any'/'unknown'",
  byArea,
  byPackage,
  topFiles: fileRows.slice(0, 40),
  totalFilesWithCasts: fileRows.length
};

if (isJson) {
  const outPath = path.join(process.cwd(), "docs", "typecast-inventory.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Wrote ${outPath}`);
} else {
  console.log("=== F0 Typecast Inventory (AST) ===");
  console.log("Área        any    unknown  total");
  for (const a of ["production", "tests", "scripts"] as Area[]) {
    const c = byArea[a];
    console.log(`${a.padEnd(11)} ${String(c.anyCount).padStart(5)}  ${String(c.unknownCount).padStart(7)}  ${String(c.total).padStart(5)}`);
  }
  const tot = byArea.production.total + byArea.tests.total + byArea.scripts.total;
  console.log(`${"TOTAL".padEnd(11)} ${String(byArea.production.anyCount + byArea.tests.anyCount + byArea.scripts.anyCount).padStart(5)}  ${String(byArea.production.unknownCount + byArea.tests.unknownCount + byArea.scripts.unknownCount).padStart(7)}  ${String(tot).padStart(5)}`);
  console.log("");
  console.log("=== Por paquete (prod / tests / scripts) ===");
  const pkgs = Object.keys(byPackage).sort();
  for (const p of pkgs) {
    const b = byPackage[p];
    const line = `${p.padEnd(24)} prod=${b.production.total} tests=${b.tests.total} scripts=${b.scripts.total} (any=${b.production.anyCount + b.tests.anyCount + b.scripts.anyCount}, unk=${b.production.unknownCount + b.tests.unknownCount + b.scripts.unknownCount})`;
    console.log(line);
  }
  console.log("");
  console.log("=== Top 25 archivos ===");
  for (const r of fileRows.slice(0, 25)) {
    console.log(`${String(r.total).padStart(4)} (${r.area}) ${r.file}`);
  }
  console.log("");
  console.log(`Archivos con casts: ${fileRows.length}`);
}