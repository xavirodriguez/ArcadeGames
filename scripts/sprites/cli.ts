import path from "node:path";
import {
  checkSpriteArtifacts,
  generateSpriteArtifacts,
  writeSpriteArtifacts
} from "./SpritePipeline";

interface CliOptions {
  sheetId?: string;
  dryRun: boolean;
  check: boolean;
  verbose: boolean;
}

function parseArguments(argumentsList: readonly string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    check: false,
    verbose: false
  };

  for (let index = 0; index < argumentsList.length; index++) {
    const argument = argumentsList[index] ?? "";

    if (argument === "--") {
      continue;
    } else if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--check") {
      options.check = true;
    } else if (argument === "--verbose") {
      options.verbose = true;
    } else if (argument.startsWith("--sheet=")) {
      options.sheetId = argument.slice("--sheet=".length);
    } else if (argument === "--sheet") {
      const next = argumentsList[index + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("--sheet requires a sprite sheet id.");
      }
      options.sheetId = next;
      index++;
    } else {
      throw new Error("Unknown sprites:build argument: " + argument);
    }
  }

  if (options.dryRun && options.check) {
    throw new Error("--dry-run and --check cannot be combined.");
  }
  if (options.sheetId !== undefined && options.sheetId.trim().length === 0) {
    throw new Error("--sheet requires a non-empty sprite sheet id.");
  }

  return options;
}

function main(): void {
  try {
    const options = parseArguments(process.argv.slice(2));
    const repositoryRoot = path.resolve(process.cwd());
    const result = generateSpriteArtifacts({
      repositoryRoot,
      sheetId: options.sheetId
    });

    if (options.verbose) {
      for (const sheet of result.sheets) {
        console.log(
          "[sprites:build] " + sheet.id + " (" + sheet.category + ", " +
          sheet.sourceMode + "): " + sheet.animationNames.join(", ")
        );
      }
    }

    if (options.check) {
      const issues = checkSpriteArtifacts(repositoryRoot, result);
      if (issues.length > 0) {
        console.error("Sprite artifact verification failed:");
        for (const issue of issues) {
          console.error("- " + issue);
        }
        process.exitCode = 1;
        return;
      }

      console.log(
        "Sprite artifact verification passed: " + result.artifacts.length +
        " generated artifact(s), " + result.sheets.length + " source sheet(s)."
      );
      return;
    }

    if (options.dryRun) {
      console.log("Sprite build dry-run; no files were written.");
      for (const artifact of result.artifacts) {
        console.log("- " + artifact.path);
      }
      for (const stalePath of result.stalePaths) {
        console.log("- remove stale: " + stalePath);
      }
      return;
    }

    writeSpriteArtifacts(repositoryRoot, result);
    console.log(
      "Sprite build completed: " + result.artifacts.length +
      " artifact(s), " + result.sheets.length + " source sheet(s)."
    );
    if (result.stalePaths.length > 0) {
      console.log("Removed " + result.stalePaths.length + " stale generated artifact(s).");
    }
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[sprites:build] " + detail);
    process.exitCode = 1;
  }
}

main();
