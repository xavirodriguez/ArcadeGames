import { execSync } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { parse, Lang, SgNode } from "@ast-grep/napi";

/**
 * Script de detección de código duplicado e inserción automática
 * de comentarios TODO de refactorización usando `jscpd` y `ast-grep` (@ast-grep/napi).
 */

const REPORT_FILE = path.join(process.cwd(), "report", "jscpd-report.json");
const BASE_DIRS = ["packages/core/src", "src/games", "src", "."];

interface JSCPDCloneFile {
  name: string;
  start: number;
  end: number;
}

interface JSCPDClone {
  format: string;
  lines: number;
  tokens: number;
  firstFile: JSCPDCloneFile;
  secondFile: JSCPDCloneFile;
  fragment: string;
}

interface JSCPDReport {
  duplicates: JSCPDClone[];
}

/**
 * Resuelve la ruta relativa reportada por jscpd a un archivo real en disco.
 */
function resolveFilePath(relPath: string): string | null {
  for (const base of BASE_DIRS) {
    const full = path.join(process.cwd(), base, relPath);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return full;
    }
  }
  if (fs.existsSync(relPath) && fs.statSync(relPath).isFile()) {
    return path.resolve(relPath);
  }
  return null;
}

/**
 * Genera un hash determinista de 8 caracteres para catalogar el clon duplicado.
 */
function computeCloneHash(clone: JSCPDClone): string {
  // Strip TODO comments and normalize whitespace so comment insertions never alter the hash
  const cleanCode = clone.fragment
    .replace(/\/\/#?.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  const payload = `${clone.firstFile.name}:${clone.secondFile.name}:${cleanCode}`;
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 8);
}

/**
 * Determina el tipo de nodo/bloque AST en español para contextualizar la refactorización.
 */
function getNodeTypeLabel(node: SgNode): string {
  const k = String(node.kind());
  if (k === "function_declaration" || k === "arrow_function" || k === "function_expression") {
    return "función";
  }
  if (k === "method_definition") {
    return "método";
  }
  if (k === "statement_block") {
    return "bloque de código";
  }
  if (k === "class_declaration" || k === "interface_declaration") {
    return "clase";
  }
  return "bloque";
}

/**
 * Normaliza un nodo candidato asegurando que la anotación TODO no se coloque en medio de una cabecera
 * (por ejemplo entre 'function foo()' y '{', dentro de 'for(...)', o dentro de un par de objeto).
 */
function normalizeNodeForComment(node: SgNode): SgNode {
  let current: SgNode | null = node;

  while (current) {
    const kind = String(current.kind());
    const parentNode: SgNode | null = current.parent();
    const parentKind = parentNode ? String(parentNode.kind()) : "";

    if (kind === "statement_block") {
      if (
        parentKind === "function_declaration" ||
        parentKind === "method_definition" ||
        parentKind === "arrow_function" ||
        parentKind === "function_expression" ||
        parentKind === "if_statement" ||
        parentKind === "for_statement" ||
        parentKind === "for_in_statement" ||
        parentKind === "while_statement" ||
        parentKind === "try_statement" ||
        parentKind === "catch_clause"
      ) {
        current = parentNode;
        continue;
      }
    }

    if (kind === "pair" || kind === "property_identifier") {
      if (parentNode) {
        current = parentNode;
        continue;
      }
    }

    if (parentKind === "export_statement") {
      current = parentNode;
      continue;
    }

    if (parentKind === "catch_clause") {
      current = parentNode;
      continue;
    }

    break;
  }

  return current || node;
}

/**
 * Busca en el AST el nodo statement/declaration más adecuado correspondiente a la línea de inicio.
 */
function findTargetASTNode(rootNode: SgNode, startLine: number, endLine: number): SgNode | null {
  let closestNode: SgNode | null = null;
  let minLineDiff = Infinity;
  let minSpan = Infinity;

  function traverse(node: SgNode) {
    if (!node.isNamed()) return;
    const kind = String(node.kind());

    if (kind === "program") {
      for (const child of node.children()) {
        traverse(child);
      }
      return;
    }

    const range = node.range();
    const nStart = range.start.line + 1;
    const nEnd = range.end.line + 1;

    const lineDiff = Math.abs(nStart - startLine);
    const span = nEnd - nStart;

    const isStatementOrDecl =
      kind.endsWith("_declaration") ||
      kind.endsWith("_statement") ||
      kind === "method_definition" ||
      kind === "function_declaration" ||
      kind === "class_declaration" ||
      kind === "interface_declaration" ||
      kind === "statement_block" ||
      kind === "export_statement";

    if (isStatementOrDecl && lineDiff <= 3) {
      if (lineDiff < minLineDiff || (lineDiff === minLineDiff && span < minSpan)) {
        minLineDiff = lineDiff;
        minSpan = span;
        closestNode = node;
      }
    } else if (nStart <= startLine && nEnd >= endLine) {
      if (minLineDiff > 3 && span < minSpan) {
        minSpan = span;
        closestNode = node;
      }
    }

    for (const child of node.children()) {
      traverse(child);
    }
  }

  traverse(rootNode);

  if (closestNode) {
    return normalizeNodeForComment(closestNode);
  }
  return null;
}

/**
 * Ejecuta jscpd para refrescar el reporte JSON de duplicados.
 */
function runJSCPD(): void {
  console.log("🔍 Ejecutando jscpd para detectar código duplicado...");
  const reportDir = path.dirname(REPORT_FILE);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  try {
    execSync("pnpm exec jscpd --config .jscpd.json --output ./report", {
      stdio: "pipe",
      encoding: "utf-8"
    });
  } catch (_err) {
    // Swallowing exit code when clones found
  }

  if (!fs.existsSync(REPORT_FILE)) {
    console.error(`❌ Error: No se pudo generar el reporte de jscpd en '${REPORT_FILE}'.`);
    process.exit(1);
  }
}

function main() {
  runJSCPD();

  const reportRaw = fs.readFileSync(REPORT_FILE, "utf-8");
  const report: JSCPDReport = JSON.parse(reportRaw);

  const clones = report.duplicates || [];
  console.log(`📊 Clones duplicados catalogados por jscpd: ${clones.length}`);

  if (clones.length === 0) {
    console.log("✅ ¡No se encontraron duplicados!");
    return;
  }

  interface PendingEdit {
    node: SgNode;
    line: number;
    hash: string;
    nodeType: string;
    otherLocation: string;
  }

  const fileEditsMap = new Map<string, PendingEdit[]>();
  let skippedCount = 0;

  for (const clone of clones) {
    if (clone.fragment.includes("// TODO") || clone.fragment.trim().startsWith("//")) {
      continue;
    }

    const hash = computeCloneHash(clone);

    const occurrences: Array<{ target: JSCPDCloneFile; other: JSCPDCloneFile }> = [
      { target: clone.firstFile, other: clone.secondFile },
      { target: clone.secondFile, other: clone.firstFile }
    ];

    for (const { target, other } of occurrences) {
      const fullPath = resolveFilePath(target.name);
      if (!fullPath) continue;

      const content = fs.readFileSync(fullPath, "utf-8");

      // Idempotency: skip if hash is already present anywhere in source code
      if (content.includes(`Ref: ${hash}`) || content.includes(hash)) {
        skippedCount++;
        continue;
      }

      const root = parse(Lang.TypeScript, content);
      const rootNode = root.root();

      const node = findTargetASTNode(rootNode, target.start, target.end);
      if (!node) continue;

      const line = node.range().start.line + 1; // 1-based start line of node
      const lines = content.split("\n");

      // Check if line or line-1 already has a TODO comment in the file
      const prevLineText = lines[line - 2] || "";
      const currentLineText = lines[line - 1] || "";
      if (prevLineText.includes("// TODO(refactor):") || currentLineText.includes("// TODO(refactor):")) {
        skippedCount++;
        continue;
      }

      if (!fileEditsMap.has(fullPath)) {
        fileEditsMap.set(fullPath, []);
      }

      const pending = fileEditsMap.get(fullPath)!;

      // STRICT RULE: At most ONE TODO per line position (within 3 lines of tolerance)
      const alreadyHasCommentOnLine = pending.some((e) => Math.abs(e.line - line) <= 3 || e.hash === hash);
      if (!alreadyHasCommentOnLine) {
        const nodeType = getNodeTypeLabel(node);
        const otherLocation = `${other.name}:${other.start}-${other.end}`;
        pending.push({ node, line, hash, nodeType, otherLocation });
      } else {
        skippedCount++;
      }
    }
  }

  let totalInserted = 0;

  for (const [fullPath, editsInfo] of fileEditsMap.entries()) {
    let content = fs.readFileSync(fullPath, "utf-8");
    const root = parse(Lang.TypeScript, content);
    const rootNode = root.root();

    const lines = content.split("\n");
    const astEdits = [];

    for (const editInfo of editsInfo) {
      const range = editInfo.node.range();
      const lineIndex = range.start.line;
      const lineText = lines[lineIndex] || "";
      const indent = lineText.match(/^\s*/)?.[0] || "";

      const todoComment = `// TODO(refactor): código duplicado detectado (${editInfo.nodeType}) con ${editInfo.otherLocation}. Considerar extraer a función compartida. Ref: ${editInfo.hash}\n${indent}`;
      astEdits.push(editInfo.node.replace(`${todoComment}${editInfo.node.text()}`));
      totalInserted++;
    }

    const updatedContent = rootNode.commitEdits(astEdits);
    fs.writeFileSync(fullPath, updatedContent, "utf-8");

    const relFile = path.relative(process.cwd(), fullPath);
    console.log(`📝 Insertado(s) ${editsInfo.length} TODO(s) de refactorización en '${relFile}'.`);
  }

  console.log(`\n🎉 Resumen de Detección de Duplicados:`);
  console.log(`   - TODOs insertados en esta ejecución: ${totalInserted}`);
  console.log(`   - TODOs omitidos (ya existentes / deduplicados por posición): ${skippedCount}`);
  console.log(`   - Total clones procesados: ${clones.length}`);
}

main();
