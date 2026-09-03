import { execSync } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { parse, Lang, SgNode } from "@ast-grep/napi";

interface JSCPDLocation {
  name: string;
  start: number; // 1-indexed
  end: number;   // 1-indexed
  startLoc?: {
    line: number;
    column: number;
    position: number;
  };
  endLoc?: {
    line: number;
    column: number;
    position: number;
  };
}

interface JSCPDDuplicate {
  format: string;
  lines: number;
  tokens: number;
  firstFile: JSCPDLocation;
  secondFile: JSCPDLocation;
  fragment: string;
}

interface JSCPDReport {
  duplicates: JSCPDDuplicate[];
}

const REPORT_DIR = path.join(process.cwd(), "report");
const REPORT_FILE = path.join(REPORT_DIR, "jscpd-report.json");

/**
 * Executes jscpd CLI to generate the duplication report JSON.
 */
function runJSCPD(): void {
  console.log("🔍 Ejecutando jscpd para detectar código duplicado...");
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  try {
    execSync("pnpm exec jscpd --config .jscpd.json --output ./report", {
      stdio: "pipe",
      encoding: "utf-8"
    });
  } catch {
    // jscpd returns non-zero status code when clones are found.
    // We swallow the process exit error if the report was generated successfully.
  }

  if (!fs.existsSync(REPORT_FILE)) {
    console.error(`❌ Error: No se pudo generar el reporte jscpd en '${REPORT_FILE}'.`);
    process.exit(1);
  }
}

/**
 * Resolves relative or candidate paths reported by jscpd to an existing file on disk.
 */
function resolveFilePath(fileName: string): string | null {
  if (fs.existsSync(fileName)) return fileName;
  const searchBases = ["packages/core/src", "src"];
  for (const base of searchBases) {
    const candidate = path.join(base, fileName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Generates a stable short hash identifying a duplicate clone pair.
 */
function computeCloneHash(
  file1: string,
  start1: number,
  end1: number,
  file2: string,
  start2: number,
  end2: number
): string {
  const normalizedKey = [
    `${file1}:${start1}-${end1}`,
    `${file2}:${start2}-${end2}`
  ].sort().join("|");

  return crypto.createHash("md5").update(normalizedKey).digest("hex").substring(0, 8);
}

/**
 * Finds the AST node spanning or closest to the starting line of the reported duplication.
 */
function findTargetASTNode(rootNode: SgNode, targetLine0: number): SgNode | null {
  const candidateRules = [
    { kind: "method_definition" },
    { kind: "function_declaration" },
    { kind: "arrow_function" },
    { kind: "class_declaration" },
    { kind: "lexical_declaration" },
    { kind: "if_statement" },
    { kind: "for_statement" },
    { kind: "while_statement" },
    { kind: "expression_statement" },
    { kind: "statement_block" }
  ];

  const allNodes = rootNode.findAll({
    rule: {
      any: candidateRules
    }
  });

  if (allNodes.length === 0) {
    return null;
  }

  let bestNode: SgNode | null = null;
  let minDistance = Infinity;

  for (const node of allNodes) {
    const range = node.range();
    const distance = Math.abs(range.start.line - targetLine0);

    if (distance < minDistance) {
      minDistance = distance;
      bestNode = node;
    }
  }

  return bestNode;
}

/**
 * Main execution function to detect duplicates and insert TODO refactoring comments.
 */
export function processDuplicates(): void {
  runJSCPD();

  const rawReport = fs.readFileSync(REPORT_FILE, "utf-8");
  const report: JSCPDReport = JSON.parse(rawReport);

  // Group duplicate locations by file path so we process each file bottom-to-top (descending line numbers)
  interface Task {
    fileLoc: JSCPDLocation;
    otherLoc: JSCPDLocation;
    cloneHash: string;
  }

  const tasksByFile = new Map<string, Task[]>();

  for (const duplicate of report.duplicates) {
    const path1 = resolveFilePath(duplicate.firstFile.name);
    const path2 = resolveFilePath(duplicate.secondFile.name);

    if (!path1 || !path2) {
      continue;
    }

    const cloneHash = computeCloneHash(
      duplicate.firstFile.name,
      duplicate.firstFile.start,
      duplicate.firstFile.end,
      duplicate.secondFile.name,
      duplicate.secondFile.start,
      duplicate.secondFile.end
    );

    const pairs = [
      { filePath: path1, fileLoc: duplicate.firstFile, otherLoc: duplicate.secondFile },
      { filePath: path2, fileLoc: duplicate.secondFile, otherLoc: duplicate.firstFile }
    ];

    for (const { filePath, fileLoc, otherLoc } of pairs) {
      if (!tasksByFile.has(filePath)) {
        tasksByFile.set(filePath, []);
      }
      tasksByFile.get(filePath)!.push({ fileLoc, otherLoc, cloneHash });
    }
  }

  let totalClonesAnalyzed = report.duplicates.length;
  let newCommentsAdded = 0;
  let skippedExisting = 0;

  for (const [filePath, tasks] of tasksByFile.entries()) {
    // Sort tasks in descending order of starting line to maintain line offset consistency
    tasks.sort((a, b) => b.fileLoc.start - a.fileLoc.start);

    let content = fs.readFileSync(filePath, "utf-8");

    for (const { fileLoc, otherLoc, cloneHash } of tasks) {
      // Check idempotency: avoid inserting duplicate comment if Ref tag exists
      if (content.includes(`Ref: ${cloneHash}`)) {
        skippedExisting++;
        continue;
      }

      const sg = parse(Lang.TypeScript, content);
      const root = sg.root();

      // Convert 1-indexed jscpd line numbers to 0-indexed ast-grep line numbers
      const targetLine0 = fileLoc.start - 1;
      const targetNode = findTargetASTNode(root, targetLine0);

      if (!targetNode) {
        continue;
      }

      const nodeRange = targetNode.range();
      const colStart = nodeRange.start.column;
      const indent = " ".repeat(colStart);

      const otherRef = `${otherLoc.name}:${otherLoc.start}-${otherLoc.end}`;
      const todoComment = `// TODO(refactor): código duplicado detectado con archivo(s) [${otherRef}]. Considerar extraer a función compartida. Ref: ${cloneHash}`;
      const textToInsert = `${todoComment}\n${indent}`;

      content = root.commitEdits([
        targetNode.replace(`${textToInsert}${targetNode.text()}`)
      ]);

      newCommentsAdded++;
    }

    fs.writeFileSync(filePath, content, "utf-8");
  }

  console.log(`\n✅ Proceso de detección e inserción de TODOs finalizado:`);
  console.log(`   Clones analizados: ${totalClonesAnalyzed}`);
  console.log(`   Comentarios TODO nuevos insertados: ${newCommentsAdded}`);
  console.log(`   Comentarios TODO omitidos (ya existentes): ${skippedExisting}`);
}

if (require.main === module) {
  processDuplicates();
}
