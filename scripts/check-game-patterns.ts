import * as fs from "fs";
import * as path from "path";

const ROOT_DIR = path.resolve(__dirname, "..");

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== "node_modules" && file !== ".git" && file !== "dist" && file !== "compiled-js" && file !== ".turbo") {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs")) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// -------------------------------------------------------------
// Guard 3a: gameplayRandom.unlock / gameplayRandom.lock lockdown
// -------------------------------------------------------------
function checkGameplayRandomLockdown(): string[] {
  const errors: string[] = [];
  const files = getAllFiles(ROOT_DIR);

  const ALLOWLIST = [
    path.join("src", "games", "shared", "configHelper.ts"),
    path.join("packages", "core", "src", "ecs", "Schedule.ts"),
    path.join("packages", "core", "src", "ecs", "World.ts"),
    path.join("packages", "core", "src", "runtime", "BaseGame.ts"),
    path.join("packages", "core", "src", "story", "StoryRuntime.ts"),
    path.join("server", "src", "AsteroidsRoom.ts")
  ];

  files.forEach((filePath) => {
    const relPath = path.relative(ROOT_DIR, filePath);

    // Skip test files and scripts directory
    if (
      relPath.startsWith("scripts") ||
      relPath.includes("__tests__") ||
      relPath.endsWith(".test.ts") ||
      relPath.endsWith(".test.tsx") ||
      relPath.endsWith(".spec.ts")
    ) {
      return;
    }

    // Skip allowlisted files
    if (ALLOWLIST.some((allowed) => relPath.endsWith(allowed))) {
      return;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    if (content.includes("gameplayRandom." + "unlock(") || content.includes("gameplayRandom." + "lock(")) {
      errors.push(`[3a] Manual gameplayRandom unlock/lock detected in '${relPath}'. Use 'runWithUnlockedRandomAndMutators' from 'src/games/shared/configHelper.ts' instead.`);
    }
  });

  return errors;
}

// -------------------------------------------------------------
// Guard 3b: Inline paddle collider check in src/games/**
// -------------------------------------------------------------
function checkInlinePaddleColliders(): string[] {
  const errors: string[] = [];
  const gamesDir = path.join(ROOT_DIR, "src", "games");
  if (!fs.existsSync(gamesDir)) return errors;

  const files = getAllFiles(gamesDir);

  files.forEach((filePath) => {
    const relPath = path.relative(ROOT_DIR, filePath);

    // Skip test files and componentBuilders itself
    if (
      relPath.includes("__tests__") ||
      relPath.endsWith(".test.ts") ||
      relPath.endsWith("componentBuilders.ts")
    ) {
      return;
    }

    const content = fs.readFileSync(filePath, "utf-8");

    // Scan for inline paddle collider blocks: Box shape + PLAYER layer + PROJECTILE mask in same object
    const blocks = content.split(/;|\n\s*\n/);
    for (const block of blocks) {
      const isBox = block.includes("ShapeType.Box") || block.includes('type: "box"') || block.includes("type: 'box'");
      const isPlayerLayer = block.includes("layer: CollisionLayers.PLAYER") || block.includes("layer:PLAYER");
      const isProjectileMask = block.includes("mask: CollisionLayers.PROJECTILE") || block.includes("mask:CollisionLayers.PROJECTILE");

      if (isBox && isPlayerLayer && isProjectileMask && !block.includes("createPaddleColliderConfig")) {
        errors.push(`[3b] Duplicate inline paddle collider definition found in '${relPath}'. Re-use 'createPaddleColliderConfig' from 'src/games/shared/componentBuilders.ts'.`);
        break;
      }
    }
  });

  return errors;
}

// -------------------------------------------------------------
// Guard 3c: Game discovery and Jest config root registration
// -------------------------------------------------------------
function checkJestConfigRegistration(): string[] {
  const errors: string[] = [];
  const rootJestPath = path.join(ROOT_DIR, "jest.config.cjs");

  if (!fs.existsSync(rootJestPath)) {
    errors.push(`[3c] Root jest.config.cjs not found at ${rootJestPath}`);
    return errors;
  }

  const rootJestContent = fs.readFileSync(rootJestPath, "utf-8");
  const gamesDir = path.join(ROOT_DIR, "src", "games");

  if (!fs.existsSync(gamesDir)) return errors;

  const gameFolders = fs.readdirSync(gamesDir).filter((folder) => {
    const fullPath = path.join(gamesDir, folder);
    return fs.statSync(fullPath).isDirectory() && folder !== "shared";
  });

  gameFolders.forEach((game) => {
    const gameDir = path.join(gamesDir, game);
    const testsDir = path.join(gameDir, "__tests__");

    // Check if game has tests
    if (fs.existsSync(testsDir)) {
      const hasTests = fs.readdirSync(testsDir).some((f) => f.endsWith(".test.ts") || f.endsWith(".test.tsx"));
      if (hasTests) {
        const localJest = path.join(gameDir, "jest.config.cjs");
        if (!fs.existsSync(localJest)) {
          errors.push(`[3c] Game '${game}' has tests in __tests__/ but is missing 'src/games/${game}/jest.config.cjs'.`);
        } else {
          const expectedReg = `<rootDir>/src/games/${game}/jest.config.cjs`;
          if (!rootJestContent.includes(expectedReg) && !rootJestContent.includes(`src/games/${game}/jest.config.cjs`)) {
            errors.push(`[3c] Game '${game}' has a local jest.config.cjs but is not registered in the root 'jest.config.cjs' projects array.`);
          }
        }
      }
    }
  });

  return errors;
}

function runPatternChecks(): void {
  console.log("🤖 Running Anti-Duplication & Architecture Guard Linter...\n");

  const errs3a = checkGameplayRandomLockdown();
  const errs3b = checkInlinePaddleColliders();
  const errs3c = checkJestConfigRegistration();

  const allErrors = [...errs3a, ...errs3b, ...errs3c];

  if (allErrors.length > 0) {
    console.error("❌ Architectural pattern violations detected:");
    allErrors.forEach((err) => console.error(`  - ${err}`));
    console.error("\nPlease resolve the above issues before committing.");
    process.exit(1);
  } else {
    console.log("✅ Guard 3a: No unauthorized gameplayRandom unlock/lock calls detected.");
    console.log("✅ Guard 3b: No duplicate inline paddle collider definitions detected.");
    console.log("✅ Guard 3c: All games with test suites have registered local jest.config.cjs files.");
    console.log("\n🎉 All automated pattern checks passed successfully!");
  }
}

runPatternChecks();
