import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Script de Ratchet Linter para duplicación de código usando `jscpd`.
 *
 * Mide duplicados en `packages/core/src` y `src/games`, excluyendo tests y artefactos.
 * Compara contra `scripts/duplication-baseline.json` y falla si las líneas duplicadas o
 * el porcentaje de duplicación incrementan respecto al baseline.
 */

const BASELINE_FILE = path.join(process.cwd(), "scripts", "duplication-baseline.json");
const REPORT_FILE = path.join(process.cwd(), "report", "jscpd-report.json");
const isUpdateMode = process.argv.includes("--update");

interface JSCPDReport {
  duplicates: Array<{
    format: string;
    lines: number;
    tokens: number;
    firstFile: {
      name: string;
      start: number;
      end: number;
    };
    secondFile: {
      name: string;
      start: number;
      end: number;
    };
    fragment: string;
  }>;
  statistics: {
    total: {
      clones: number;
      duplicatedLines: number;
      duplicatedTokens: number;
      lines: number;
      percentage: number;
      percentageTokens: number;
      sources: number;
      tokens: number;
    };
  };
}

interface BaselineData {
  duplicatedLines: number;
  clones: number;
  percentage: number;
  totalLines: number;
}

// Ensure report output directory exists
const reportDir = path.dirname(REPORT_FILE);
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

console.log("🔍 Ejecutando jscpd para medir duplicación de código...");

try {
  execSync("pnpm exec jscpd --config .jscpd.json --output ./report", {
    stdio: "pipe",
    encoding: "utf-8"
  });
} catch (error: any) {
  // jscpd returns non-zero code when clones are found unless muted or configured.
  // We swallow the CLI exit error if report was generated.
  if (!fs.existsSync(REPORT_FILE)) {
    console.error("❌ Error ejecutando jscpd:", error.message || error);
    process.exit(1);
  }
}

if (!fs.existsSync(REPORT_FILE)) {
  console.error(`❌ Reporte no generado en '${REPORT_FILE}'.`);
  process.exit(1);
}

const rawReport = fs.readFileSync(REPORT_FILE, "utf-8");
const report: JSCPDReport = JSON.parse(rawReport);

const currentStats = report.statistics.total;
const currentData: BaselineData = {
  duplicatedLines: currentStats.duplicatedLines,
  clones: currentStats.clones,
  percentage: Number(currentStats.percentage.toFixed(2)),
  totalLines: currentStats.lines
};

if (isUpdateMode) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(currentData, null, 2) + "\n", "utf-8");
  console.log(`✅ Baseline de duplicación actualizado exitosamente en '${path.relative(process.cwd(), BASELINE_FILE)}'.`);
  console.log(`   Líneas duplicadas: ${currentData.duplicatedLines} (${currentData.percentage}%)`);
  console.log(`   Clones catalogados: ${currentData.clones}`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE_FILE)) {
  console.error(`❌ Baseline file not found: '${BASELINE_FILE}'.`);
  console.error(`   Ejecuta 'pnpm run duplication:update-baseline' para generar el baseline inicial.`);
  process.exit(1);
}

const baseline: BaselineData = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf-8"));

const diffLines = currentData.duplicatedLines - baseline.duplicatedLines;
const isRegression = diffLines > 0 || currentData.percentage > baseline.percentage + 0.05;

// Output Markdown Report for GitHub Step Summary
function writeGithubSummary() {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  let md = `## 🤖 Reporte de Duplicación de Código (Ratchet)\n\n`;
  md += `| Métrica | Actual | Baseline | Estado |\n`;
  md += `| --- | --- | --- | --- |\n`;
  md += `| **Líneas Duplicadas** | ${currentData.duplicatedLines} | ${baseline.duplicatedLines} | ${diffLines <= 0 ? "✅" : "❌ (+" + diffLines + ")"} |\n`;
  md += `| **% Duplicación** | ${currentData.percentage}% | ${baseline.percentage}% | ${currentData.percentage <= baseline.percentage ? "✅" : "❌"} |\n`;
  md += `| **Clones Detectados** | ${currentData.clones} | ${baseline.clones} | ${currentData.clones <= baseline.clones ? "✅" : "⚠️"} |\n`;
  md += `| **Líneas Totales Escaneadas** | ${currentData.totalLines} | ${baseline.totalLines} | - |\n\n`;

  // Sort clones by line count descending and pick top 10
  const topClones = [...report.duplicates]
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10);

  if (topClones.length > 0) {
    md += `### 🔝 Top 10 Clones Más Grandes\n\n`;
    md += `| Archivo 1 (Líneas) | Archivo 2 (Líneas) | Líneas Duplicadas | Tokens |\n`;
    md += `| --- | --- | --- | --- |\n`;
    for (const clone of topClones) {
      const f1 = `${clone.firstFile.name}:${clone.firstFile.start}-${clone.firstFile.end}`;
      const f2 = `${clone.secondFile.name}:${clone.secondFile.start}-${clone.secondFile.end}`;
      md += `| \`${f1}\` | \`${f2}\` | ${clone.lines} | ${clone.tokens} |\n`;
    }
  }

  fs.appendFileSync(summaryPath, md + "\n", "utf-8");
}

writeGithubSummary();

console.log(`🤖 Duplication Ratchet Results`);
console.log(`===========================================================`);
console.log(`Líneas duplicadas actuales: ${currentData.duplicatedLines} (${currentData.percentage}%)`);
console.log(`Líneas duplicadas baseline: ${baseline.duplicatedLines} (${baseline.percentage}%)`);
console.log(`Total clones: ${currentData.clones}`);

if (isRegression) {
  console.error(`\n❌ REGRESION DE DUPLICACION DETECTADA:`);
  console.error(`  - Líneas duplicadas incrementaron en +${diffLines} (de ${baseline.duplicatedLines} a ${currentData.duplicatedLines}).`);
  console.error(`  - Porcentaje de duplicación: ${currentData.percentage}% vs baseline=${baseline.percentage}%.`);
  console.error(`\nFavor de evitar duplicar bloques de código o refactorizar el nuevo duplicado.`);
  process.exit(1);
}

console.log(`\n✅ Ratchet verification passed! La duplicación no superó el baseline.`);
if (diffLines < 0) {
  console.log(`🎉 ¡Progreso detectado! Se redujeron ${Math.abs(diffLines)} líneas duplicadas respecto al baseline.`);
  console.log(`   Ejecuta 'pnpm run duplication:update-baseline' para actualizar el baseline y consolidar el avance.`);
}

process.exit(0);
