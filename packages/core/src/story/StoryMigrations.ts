import { StoryPackage, StoryGraph, StoryChoice, StoryNode } from "./StoryTypes";

/**
 * Current active story schema version in engine core.
 * @public
 */
export const CURRENT_STORY_SCHEMA_VERSION = 3;

/**
 * Migration pipeline for converting legacy story data formats to the latest `StoryPackage` schema.
 *
 * @remarks
 * Safely transforms older graph asset structures, legacy choice effect property names,
 * and un-packaged single graph definitions into standard versioned `StoryPackage` structures.
 *
 * @public
 */
export class StoryMigrations {
  /**
   * Migrates a raw or legacy story data structure to the target schema version.
   *
   * @param raw - Raw story graph or package JSON object.
   * @param targetVersion - Desired schema version (defaults to CURRENT_STORY_SCHEMA_VERSION = 3).
   * @returns Fully migrated and normalized `StoryPackage`.
   */
  public static migrateStoryPackage(
    raw: any,
    targetVersion: number = CURRENT_STORY_SCHEMA_VERSION
  ): StoryPackage {
    if (!raw) {
      throw new Error("Cannot migrate null or undefined story data.");
    }

    let pkg: StoryPackage;

    // Convert raw single StoryGraph into StoryPackage format if manifest is missing
    if (!raw.manifest && raw.nodes && raw.entryNodeId) {
      pkg = {
        manifest: {
          id: raw.id || "migrated_story",
          title: raw.title || "Migrated Story",
          contentVersion: "1.0.0",
          schemaVersion: 1,
          entryGraph: raw.id || "migrated_story"
        },
        graphs: {
          [raw.id || "migrated_story"]: raw as StoryGraph
        },
        characters: raw.characters || {}
      };
    } else {
      pkg = JSON.parse(JSON.stringify(raw)) as StoryPackage;
    }

    let currentVersion = pkg.manifest.schemaVersion || 1;

    // Step 1 -> 2: Normalize choice/node effect properties and transition targets
    if (currentVersion < 2 && targetVersion >= 2) {
      for (const graph of Object.values(pkg.graphs)) {
        for (const node of Object.values(graph.nodes) as any[]) {
          if (node.onEnterEffects && !node.effects) {
            node.effects = node.onEnterEffects;
            delete node.onEnterEffects;
          }

          if (node.choices) {
            for (const choice of node.choices) {
              if (choice.target && !choice.targetNodeId) {
                choice.targetNodeId = choice.target;
                delete choice.target;
              }
              if (choice.onSelectEffects && !choice.effects) {
                choice.effects = choice.onSelectEffects;
                delete choice.onSelectEffects;
              }
            }
          }
        }
      }
      pkg.manifest.schemaVersion = 2;
      currentVersion = 2;
    }

    // Step 2 -> 3: Normalize nested effects structures (e.g. choice.effects.onSelect)
    if (currentVersion < 3 && targetVersion >= 3) {
      for (const graph of Object.values(pkg.graphs)) {
        for (const node of Object.values(graph.nodes) as any[]) {
          if (node.choices) {
            for (const choice of node.choices) {
              if (choice.effects && (choice.effects as any).onSelect) {
                choice.effects = (choice.effects as any).onSelect;
              }
            }
          }
        }
      }
      pkg.manifest.schemaVersion = 3;
      currentVersion = 3;
    }

    return pkg;
  }
}
