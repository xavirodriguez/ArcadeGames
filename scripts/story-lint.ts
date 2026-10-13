import fs from "fs";
import path from "path";
import { StoryGraphValidator } from "../packages/core/src/story/StoryGraphValidator";
import { SemanticValidator, SemanticValidationContext } from "../packages/core/src/story/SemanticValidator";
import { MiniGameEncounterDSL } from "../packages/core/src/story/EncounterDSLSchema";
import { StoryGraphRegistry } from "../packages/core/src/story/StoryGraphRegistry";
import { StoryPackageLoader, StoryPackageLoadError } from "../packages/core/src/story/StoryPackageLoader";
import { IAssetProvider } from "../packages/core/src/assets/AssetLoader";

import { caveAdventureGraph } from "../src/games/shared/story/TheCaveAdventure";
import { BlindStationGraph } from "../src/games/shared/story/BlindStation";
import { proofOfConceptStoryGraph } from "../src/games/shared/story/ProofOfConceptStoryGraph";
import {
  asteroidsStoryGraph,
  spaceInvadersStoryGraph,
  pongStoryGraph,
  flappyBirdStoryGraph,
} from "../src/games/shared/story/StoryGraphs";
import {
  escapeRoute01Encounter,
  keplerPhase2Encounter,
  keplerPhase3Encounter
} from "../src/games/asteroids/story/KeplerEncounters";

/**
 * Node filesystem provider for reading JSON packages during story-lint.
 */
class NodeFileAssetProvider implements IAssetProvider {
  public async loadImage(): Promise<unknown> { return {}; }
  public async loadAudio(): Promise<unknown> { return {}; }
  public async loadFont(): Promise<unknown> { return {}; }
  public async load(filePath: string): Promise<unknown> {
    const rawContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(rawContent);
  }
}

/**
 * Initialize StoryGraphRegistry with static TypeScript graph fallbacks.
 */
function initializeRegistry(): StoryGraphRegistry {
  const registry = StoryGraphRegistry.getInstance();
  registry.clear();

  registry.registerStaticGraph(caveAdventureGraph, "src/games/shared/story/TheCaveAdventure.ts", {
    declaredFlags: ["has_torch"],
  });

  registry.registerStaticGraph(BlindStationGraph, "src/games/shared/story/BlindStation.ts", {
    declaredFlags: [
      "visitedReactor",
      "visitedInfirmary",
      "visitedComms",
      "investigationComplete",
      "reactorActive",
      "foundVega",
      "rescueIncoming",
      "sawCryoRecord",
      "sawSecretRecording",
      "powerInfirmary",
      "powerComms",
      "powerLifeSupport",
      "secretEndingUnlocked",
    ],
    declaredVariables: ["evidenceCount", "trustARES", "trustVega", "oxygen", "assertiveness", "empathyStyle"],
  });

  registry.registerStaticGraph(
    asteroidsStoryGraph,
    "src/games/shared/story/StoryGraphs.ts",
    {
      declaredFlags: [
        "escapedDebrisField",
        "escapeShipDamaged",
        "ast_path_attack",
        "ast_path_stealth",
        "ast_path_investigate",
        "quarantineBreached",
        "quarantineFlawless",
        "blackBoxDecrypted",
        "keplerFlawlessRun",
        "coreOvercharged",
        "swarmMerged",
        "ending_flawless_unlocked",
        "ending_pyrrhic_unlocked",
        "ending_lost_unlocked",
        "ending_merged_unlocked",
        "navigationData"
      ],
      declaredVariables: [
        "oxygen",
        "reactorPower",
        "narrativeScore"
      ]
    },
    [escapeRoute01Encounter, keplerPhase2Encounter, keplerPhase3Encounter]
  );

  registry.registerStaticGraph(spaceInvadersStoryGraph, "src/games/shared/story/StoryGraphs.ts");
  registry.registerStaticGraph(pongStoryGraph, "src/games/shared/story/StoryGraphs.ts");
  registry.registerStaticGraph(flappyBirdStoryGraph, "src/games/shared/story/StoryGraphs.ts");

  registry.registerStaticGraph(
    proofOfConceptStoryGraph,
    "src/games/shared/story/ProofOfConceptStoryGraph.ts",
    {
      declaredFlags: [
        "asteroidsPerfect",
        "asteroidsStruggle",
        "heroicEntry",
        "route_space_invaders",
        "route_flappy_bird",
        "reinforcementsReceived",
        "invadersDefeated",
        "debrisNavigated",
        "foundSecretEvidence",
        "reduxClimaxFlawless"
      ],
      declaredVariables: [
        "spaceinvadersScore",
        "asteroidLevelReached",
        "narrativeScore"
      ]
    }
  );

  return registry;
}

async function runStoryLint(): Promise<void> {
  console.log("🔍 Running StoryGraph & StoryPackage Linting via StoryGraphRegistry...\n");

  const registry = initializeRegistry();
  const loader = new StoryPackageLoader(new NodeFileAssetProvider());

  let totalErrors = 0;
  let totalWarnings = 0;
  let auditedCount = 0;

  // Scan JSON StoryPackage directory if configured or standard directory
  const packagesDir = process.env.STORY_PACKAGES_DIR || path.join(__dirname, "../packages/core/fixtures/story");
  if (fs.existsSync(packagesDir)) {
    console.log(`📂 Scanning JSON StoryPackage directory: ${packagesDir}`);
    const files = fs.readdirSync(packagesDir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        // Skip explicitly marked invalid fixture unless directory was explicitly set
        if (!process.env.STORY_PACKAGES_DIR && file.includes("invalid")) {
          continue;
        }

        const fullPath = path.join(packagesDir, file);
        console.log(`\nLoading JSON package from ${file}...`);
        try {
          const loadResult = await loader.load(fullPath);
          registry.registerDynamicPackage(loadResult.package);
          console.log(`  ✅ Loaded and validated package '${loadResult.package.manifest.id}' (v${loadResult.package.manifest.schemaVersion})`);

          if (loadResult.validation.warnings.length > 0) {
            console.warn(`  ⚠️ ${loadResult.validation.warnings.length} warning(s) in package '${loadResult.package.manifest.id}':`);
            for (const warn of loadResult.validation.warnings) {
              console.warn(`     - ${warn}`);
            }
            totalWarnings += loadResult.validation.warnings.length;
          }
        } catch (err) {
          totalErrors++;
          if (err instanceof StoryPackageLoadError) {
            console.error(`  ❌ Failed to load JSON package [Cause: ${err.causeType}]: ${err.message}`);
            if (err.validationResult) {
              for (const e of err.validationResult.errors) {
                console.error(`     - Validation Error: ${e}`);
              }
            }
          } else {
            console.error(`  ❌ Unexpected error loading JSON package: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    }
  }

  // Audit all registered static TS entries
  console.log("\n--- Auditing Static TypeScript Graphs ---");
  const staticEntries = registry.getStaticEntries();
  for (const entry of staticEntries) {
    const graph = entry.getGraph();
    auditedCount++;
    console.log(`Checking static graph [${graph.id}] from ${entry.source}...`);

    const result = StoryGraphValidator.validate(graph, entry.options);

    if (result.errors.length > 0) {
      console.error(`  ❌ ${result.errors.length} structural error(s) found in graph '${graph.id}':`);
      for (const err of result.errors) {
        console.error(`     - [${err.type}] Node: ${err.nodeId ?? "N/A"} -> ${err.message}`);
      }
      totalErrors += result.errors.length;
    }

    if (result.warnings.length > 0) {
      console.warn(`  ⚠️ ${result.warnings.length} warning(s) in graph '${graph.id}':`);
      for (const warn of result.warnings) {
        console.warn(`     - [${warn.type}] Node: ${warn.nodeId ?? "N/A"} -> ${warn.message}`);
      }
      totalWarnings += result.warnings.length;
    }

    // Semantic validation on associated encounters if present
    if (entry.encounters && entry.encounters.length > 0) {
      const semContext: SemanticValidationContext = {
        storyGraph: graph,
        knownVariableKeys: entry.options?.declaredVariables,
        knownFlagKeys: entry.options?.declaredFlags
      };

      for (const encounter of entry.encounters) {
        const semErrors = SemanticValidator.validate(encounter as MiniGameEncounterDSL, semContext);
        for (const semErr of semErrors) {
          if (semErr.severity === "error") {
            console.error(`  ❌ Semantic Error [${semErr.code}]: ${semErr.message}`);
            totalErrors++;
          } else {
            console.warn(`  ⚠️ Semantic Warning [${semErr.code}]: ${semErr.message}`);
            totalWarnings++;
          }
        }
      }
    }

    if (result.valid) {
      console.log(`  ✅ Graph structure and semantics valid.`);
    }
  }

  // Audit registered dynamic packages
  console.log("\n--- Auditing Registered Dynamic Packages ---");
  const dynamicPackages = registry.getDynamicPackages();
  for (const pkg of dynamicPackages) {
    auditedCount++;
    console.log(`Checking dynamic package [${pkg.manifest.id}] with ${Object.keys(pkg.graphs).length} graph(s)...`);
  }

  console.log(`\nSummary: ${auditedCount} graph(s)/package(s) audited. ${totalErrors} error(s), ${totalWarnings} warning(s).`);

  if (totalErrors > 0) {
    console.error("\n❌ StoryGraph lint failed due to errors.");
    process.exit(1);
  } else {
    console.log("\n✅ StoryGraph lint completed successfully!");
  }
}

runStoryLint().catch((err) => {
  console.error("Fatal story-lint execution error:", err);
  process.exit(1);
});
