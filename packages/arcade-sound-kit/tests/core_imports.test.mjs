import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, '../dist');

function scanFileImports(filePath, visited = new Set()) {
  if (visited.has(filePath)) return;
  visited.add(filePath);

  const content = fs.readFileSync(filePath, 'utf8');

  // Assert no node built-in imports or requires
  const forbiddenPatterns = [
    /['"]node:fs['"]/,
    /['"]node:path['"]/,
    /['"]fs['"]/,
    /['"]path['"]/,
    /require\(['"]fs['"]\)/,
    /require\(['"]path['"]\)/,
    /require\(['"]node:/,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.ok(
      !pattern.test(content),
      `Forbidden Node I/O import matching ${pattern} found in pure core module ${path.relative(DIST_DIR, filePath)}`
    );
  }

  // Find relative require/import calls to traverse
  const relativeImportRegex = /(?:require\(|from\s+)['"](\.[^'"]+)['"]/g;
  let match;
  while ((match = relativeImportRegex.exec(content)) !== null) {
    const importRelPath = match[1];
    let resolved = path.resolve(path.dirname(filePath), importRelPath);
    if (!resolved.endsWith('.js')) {
      resolved += '.js';
    }
    if (fs.existsSync(resolved)) {
      scanFileImports(resolved, visited);
    }
  }
}

test('pure ./core entry point transitively contains zero fs, path or node:* imports', () => {
  const coreEntryPath = path.join(DIST_DIR, 'core_entry.js');
  assert.ok(
    fs.existsSync(coreEntryPath),
    `core_entry.js must exist at ${coreEntryPath}. Build the package first.`
  );

  const visited = new Set();
  scanFileImports(coreEntryPath, visited);

  assert.ok(visited.size > 0, 'Must visit pure core modules during import scan');
});
