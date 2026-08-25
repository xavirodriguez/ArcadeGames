import { StoryGraph } from "../packages/core/src/story/StoryTypes";
import { StoryGraphValidator, StoryGraphValidationOptions } from "../packages/core/src/story/StoryGraphValidator";
import { SemanticValidator, SemanticValidationContext } from "../packages/core/src/story/SemanticValidator";
import { MiniGameEncounterDSL } from "../packages/core/src/story/EncounterDSLSchema";

import { caveAdventureGraph } from "../src/games/shared/story/TheCaveAdventure";
import { BlindStationGraph } from "../src/games/shared/story/BlindStation";
import {
  asteroidsStoryGraph,
  spaceInvadersStoryGraph,
  pongStoryGraph,
  flappyBirdStoryGraph,
} from "../src/games/shared/story/StoryGraphs";

interface GraphRegistryEntry {
  id: string;
  sourceFile: string;
  getGraph: () => StoryGraph;
  encounters?: MiniGameEncounterDSL[];
  options?: StoryGraphValidationOptions;
  semanticContext?: SemanticValidationContext;
}

/**
 * Explicit registry of all known StoryGraph definitions in the monorepo.
 * New story graphs must be added here to be validated during CI linting.
 */
const storyGraphRegistry: GraphRegistryEntry[] = [
  {
    id: caveAdventureGraph.id,
    sourceFile: "src/games/shared/story/TheCaveAdventure.ts",
    getGraph: () => caveAdventureGraph,
    options: {
      declaredFlags: ["has_torch"],
    },
  },
  {
    id: BlindStationGraph.id,
    sourceFile: "src/games/shared/story/BlindStation.ts",
    getGraph: () => BlindStationGraph,
    options: {
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
    },
  },
  {
    id: asteroidsStoryGraph.id,
    sourceFile: "src/games/shared/story/StoryGraphs.ts",
    getGraph: () => asteroidsStoryGraph,
  },
  {
    id: spaceInvadersStoryGraph.id,
    sourceFile: "src/games/shared/story/StoryGraphs.ts",
    getGraph: () => spaceInvadersStoryGraph,
  },
  {
    id: pongStoryGraph.id,
    sourceFile: "src/games/shared/story/StoryGraphs.ts",
    getGraph: () => pongStoryGraph,
  },
  {
    id: flappyBirdStoryGraph.id,
    sourceFile: "src/games/shared/story/StoryGraphs.ts",
    getGraph: () => flappyBirdStoryGraph,
  },
];

function runStoryLint(): void {
  console.log("🔍 Running StoryGraph & Semantic Linting on registered graphs...\n");

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const entry of storyGraphRegistry) {
    const graph = entry.getGraph();
    console.log(`Checking [${graph.id}] from ${entry.sourceFile}...`);

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
        knownFlagKeys: entry.options?.declaredFlags,
        ...entry.semanticContext
      };

      for (const encounter of entry.encounters) {
        const semErrors = SemanticValidator.validate(encounter, semContext);
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
    console.log("");
  }

  console.log(`Summary: ${storyGraphRegistry.length} graph(s) audited. ${totalErrors} error(s), ${totalWarnings} warning(s).`);

  if (totalErrors > 0) {
    console.error("\n❌ StoryGraph lint failed due to structural validation errors.");
    process.exit(1);
  } else {
    console.log("\n✅ StoryGraph lint completed successfully!");
  }
}

runStoryLint();
