import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const canonicalInput = readFileSync(resolve(root, "packages/core/src/input/CanonicalInput.ts"), "utf8");
const ledger = readFileSync(resolve(root, "docs/agents/types-ledger.md"), "utf8");
const stateDeclaration = canonicalInput.match(/export interface CanonicalInputState[\s\S]*?\n}/)?.[0] ?? "";
const serializerDeclaration = canonicalInput.match(/export function canonicalToInputFrame[\s\S]*?\n}/)?.[0] ?? "";

const checks: ReadonlyArray<readonly [string, boolean]> = [
  ["CanonicalInputState.actions is a readonly CanonicalActionName array", /actions:\s*readonly CanonicalActionName<TExtra>\[\];/.test(stateDeclaration)],
  ["CanonicalInputState.actions is not represented as a Set or any", !/actions:\s*(?:Set<|any\b)/.test(stateDeclaration)],
  ["canonicalToInputFrame sorts action names before serialization", /actions:\s*\[\.\.\.state\.actions\]\.sort\(\)/.test(serializerDeclaration)],
  ["types-ledger protects Input.actions", ledger.includes("Input.actions") && ledger.includes("Protegido") && ledger.includes("Fully justified")]
];

const failures = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) {
  process.stdout.write(`${passed ? "PASS" : "FAIL"} ${name}\n`);
}
if (failures.length > 0) process.exitCode = 1;
