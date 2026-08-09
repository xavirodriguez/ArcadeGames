import { Project, SyntaxKind, ImportDeclaration, CallExpression, PropertyAccessExpression } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

const project = new Project();

// Load all ts/tsx files under packages/core/src and src/games
project.addSourceFilesAtPaths("packages/core/src/**/*.ts");
project.addSourceFilesAtPaths("packages/core/src/**/*.tsx");
project.addSourceFilesAtPaths("src/games/**/*.ts");
project.addSourceFilesAtPaths("src/games/**/*.tsx");

interface Violation {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

const violations: Violation[] = [];

function addViolation(file: string, line: number, rule: string, message: string, severity: "error" | "warning") {
  violations.push({ file, line, rule, message, severity });
}

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  const relativePath = path.relative(process.cwd(), filePath);

  // Skip test files for boundaries and simulation checks
  const isTestFile = relativePath.includes("__tests__") || relativePath.includes("/tests/") || relativePath.endsWith(".test.ts") || relativePath.endsWith(".test.tsx");

  // Rule 1 & 2: Platform and Game boundaries inside packages/core/src (excluding tests and ui/debug)
  if (relativePath.startsWith("packages/core/src") && !isTestFile && !relativePath.includes("ui/debug")) {
    const imports = sourceFile.getDescendantsOfKind(SyntaxKind.ImportDeclaration);
    for (const imp of imports) {
      const moduleSpecifier = imp.getModuleSpecifierValue();

      // Prohibited platform imports
      const platformPackages = ["react-native", "expo-", "@colyseus", "@shopify/react-native-skia"];
      for (const pkg of platformPackages) {
        if (moduleSpecifier.includes(pkg)) {
          const line = imp.getStartLineNumber();
          addViolation(
            relativePath,
            line,
            "Boundary violation: Platform import",
            `Core package must not import platform-specific package '${pkg}' (module specifier: '${moduleSpecifier}').`,
            "error"
          );
        }
      }

      // Prohibited game/app imports
      const domainPackages = ["src/games", "src/app", "@/src"];
      for (const domain of domainPackages) {
        if (moduleSpecifier.includes(domain)) {
          const line = imp.getStartLineNumber();
          addViolation(
            relativePath,
            line,
            "Boundary violation: Game/App import",
            `Core package must not import game-specific module '${domain}' (module specifier: '${moduleSpecifier}').`,
            "error"
          );
        }
      }
    }
  }

  // Determine if this file is a system or simulation file
  const isSystemOrSimulation = relativePath.includes("/systems/") || relativePath.includes("/simulation/");

  if (isSystemOrSimulation && !isTestFile) {
    // Traverse descendants of the file
    sourceFile.forEachDescendant(node => {
      // Rule 3: Math.random(), Date.now() or performance.now() inside systems & simulation
      if (node.getKind() === SyntaxKind.CallExpression) {
        const callExpr = node as CallExpression;
        const expr = callExpr.getExpression();
        if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
          const propAccess = expr as PropertyAccessExpression;
          const callerText = propAccess.getExpression().getText();
          const propName = propAccess.getName();

          if (
            (callerText === "Math" && propName === "random") ||
            (callerText === "Date" && propName === "now") ||
            (callerText === "performance" && propName === "now")
          ) {
            const line = callExpr.getStartLineNumber();
            addViolation(
              relativePath,
              line,
              "Determinism violation: Unseeded RNG or Timer",
              `Use of non-deterministic API '${callerText}.${propName}()' is forbidden in systems or simulation. Use 'world.gameplayRandom' or 'deltaTime' instead.`,
              "error"
            );
          }
        }
      }

      // Rule 4: Unsorted Object.keys, Object.entries, or Set iteration
      if (node.getKind() === SyntaxKind.CallExpression) {
        const callExpr = node as CallExpression;
        const expr = callExpr.getExpression();
        if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
          const propAccess = expr as PropertyAccessExpression;
          const callerText = propAccess.getExpression().getText();
          const propName = propAccess.getName();

          if (callerText === "Object" && (propName === "keys" || propName === "entries")) {
            // Check if the result is iterated or affects simulation and is NOT sorted
            // We check if '.sort()' is in the chain.
            // Also, we exempt immediate length checks like `.length` or `.filter(...).length`
            let isCountOrSorted = false;
            let parent = callExpr.getParent();

            while (parent) {
              if (parent.getKind() === SyntaxKind.PropertyAccessExpression) {
                const parentProp = parent as PropertyAccessExpression;
                const parentPropName = parentProp.getName();
                if (parentPropName === "length" || parentPropName === "sort") {
                  isCountOrSorted = true;
                  break;
                }
              } else if (parent.getKind() === SyntaxKind.CallExpression) {
                const parentCall = parent as CallExpression;
                const parentExpr = parentCall.getExpression();
                if (parentExpr.getKind() === SyntaxKind.PropertyAccessExpression) {
                  const parentExprProp = parentExpr as PropertyAccessExpression;
                  if (parentExprProp.getName() === "sort") {
                    isCountOrSorted = true;
                    break;
                  }
                }
              }

              // Stop traversing up if we leave the expression statement
              if (parent.getKind() === SyntaxKind.ExpressionStatement || parent.getKind() === SyntaxKind.VariableDeclaration) {
                break;
              }
              parent = parent.getParent();
            }

            if (!isCountOrSorted) {
              const line = callExpr.getStartLineNumber();
              addViolation(
                relativePath,
                line,
                "Determinism violation: Unsorted iteration",
                `Iterating or storing unsorted '${callerText}.${propName}()' results can cause non-determinism across different runtimes. Sort the keys/entries first (e.g. '.sort()').`,
                "warning"
              );
            }
          }
        }
      }

      // Rule 5: Direct mutations (addComponent, removeComponent, createEntity, removeEntity) outside WorldCommandBuffer
      // ParticleSystem.ts is exempt
      const isParticleSystem = relativePath.endsWith("ParticleSystem.ts");
      if (node.getKind() === SyntaxKind.CallExpression && !isParticleSystem) {
        const callExpr = node as CallExpression;
        const expr = callExpr.getExpression();
        if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
          const propAccess = expr as PropertyAccessExpression;
          const propName = propAccess.getName();
          const callerText = propAccess.getExpression().getText();

          if (["addComponent", "removeComponent", "createEntity", "removeEntity"].includes(propName)) {
            // Check if called directly on 'world' or other non-buffer variables
            if (["world", "this.world"].includes(callerText)) {
              const line = callExpr.getStartLineNumber();
              addViolation(
                relativePath,
                line,
                "Pureness violation: Direct mutation in System",
                `Directly calling world.${propName}() during system update is prohibited as it causes instant structural mutations. Use world.commands (WorldCommandBuffer) instead.`,
                "error"
              );
            }
          }
        }
      }
    });
  }
}

// Write summary & print results
console.log(`🤖 ECS Core Sentinel - AST Linter Results`);
console.log(`==========================================`);

const errors = violations.filter(v => v.severity === "error");
const warnings = violations.filter(v => v.severity === "warning");

if (violations.length === 0) {
  console.log("✅ All AST pureness and determinism boundaries passed successfully!");
  process.exit(0);
}

violations.forEach(v => {
  const icon = v.severity === "error" ? "❌" : "⚠️";
  console.log(`${icon} [${v.severity.toUpperCase()}] ${v.rule} in ${v.file}:${v.line}`);
  console.log(`   Message: ${v.message}\n`);
});

console.log(`Summary: Found ${errors.length} errors and ${warnings.length} warnings.`);

// Generate Github Summary formatting if running in action
const summaryLines: string[] = [];
summaryLines.push(`### 🤖 ECS Core Sentinel - AST Linter Results`);
summaryLines.push(`| Severity | File | Line | Rule | Message |`);
summaryLines.push(`| --- | --- | --- | --- | --- |`);
violations.forEach(v => {
  const icon = v.severity === "error" ? "❌ ERROR" : "⚠️ WARNING";
  summaryLines.push(`| ${icon} | \`${v.file}\` | ${v.line} | **${v.rule}** | ${v.message} |`);
});

// Write markdown summary to standard output so it gets appended to $GITHUB_STEP_SUMMARY
summaryLines.forEach(line => console.log(line));

if (errors.length > 0) {
  console.log("❌ Failing due to AST errors.");
  process.exit(1);
} else {
  console.log("✅ AST Check passed with warnings.");
  process.exit(0);
}
