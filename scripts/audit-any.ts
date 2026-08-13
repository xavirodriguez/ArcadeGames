import { Project, SyntaxKind } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

const project = new Project();

// Load all ts/tsx files under packages/core/src
project.addSourceFilesAtPaths("packages/core/src/**/*.ts");
project.addSourceFilesAtPaths("packages/core/src/**/*.tsx");

interface FileStats {
  anyCount: number;
  unknownCount: number;
}

const stats: Record<string, FileStats> = {};

let totalAny = 0;
let totalUnknown = 0;

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  const relativePath = path.relative(process.cwd(), filePath);

  // Skip test files from the baseline to focus on production files
  if (
    relativePath.includes("__tests__") ||
    relativePath.includes("/tests/") ||
    relativePath.endsWith(".test.ts") ||
    relativePath.endsWith(".test.tsx")
  ) {
    continue;
  }

  let fileAnyCount = 0;
  let fileUnknownCount = 0;

  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.AnyKeyword) {
      fileAnyCount++;
    } else if (node.getKind() === SyntaxKind.UnknownKeyword) {
      fileUnknownCount++;
    }
  });

  if (fileAnyCount > 0 || fileUnknownCount > 0) {
    stats[relativePath] = {
      anyCount: fileAnyCount,
      unknownCount: fileUnknownCount
    };
    totalAny += fileAnyCount;
    totalUnknown += fileUnknownCount;
  }
}

console.log(`\n📊 ANY/UNKNOWN TYPE AUDIT`);
console.log(`=========================`);
console.log(`Total explicit 'any' in core:     ${totalAny}`);
console.log(`Total explicit 'unknown' in core: ${totalUnknown}`);
console.log(`=========================`);

const sortedFiles = Object.entries(stats).sort((a, b) => b[1].anyCount - a[1].anyCount);

for (const [file, stat] of sortedFiles) {
  console.log("- " + file + ": any=" + stat.anyCount + ", unknown=" + stat.unknownCount);
}

const baselinePath = path.join(process.cwd(), "scripts/audit-baseline.json");

const isCheck = process.argv.includes("--check");

if (isCheck) {
  if (!fs.existsSync(baselinePath)) {
    console.error("❌ Baseline file not found at " + baselinePath + ". Please run without --check first to generate it.");
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const baselineTotalAny = baseline.totalAny;

  console.log(`\n🔍 Checking against baseline: limit of explicit 'any' is ${baselineTotalAny}`);

  if (totalAny > baselineTotalAny) {
    console.error("❌ REGRESSION DETECTED! Explicit 'any' count increased from baseline (" + baselineTotalAny + ") to current (" + totalAny + ").");
    process.exit(1);
  } else {
    console.log("✅ Passed! Current 'any' count (" + totalAny + ") is within the baseline limit (" + baselineTotalAny + ").");
  }
} else {
  // Save baseline
  const baseline = {
    totalAny,
    totalUnknown,
    files: stats
  };
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2), "utf8");
  console.log("\n💾 Baseline generated and saved to " + baselinePath);
}
