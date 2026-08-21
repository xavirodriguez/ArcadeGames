import { NarrativeSaveGame, StoryState } from "./StoryTypes";

/**
 * Migration pipeline for converting legacy narrative player save game state into standard `NarrativeSaveGame` structures.
 *
 * @remarks
 * **Semantic Distinction:**
 * - `StoryMigrations`: Handles narrative package/content schema migrations (`StoryPackage` and `StoryGraph` definition versions).
 * - `StorySaveMigrations`: Handles player save file migrations (`NarrativeSaveGame` and runtime `StoryState` progress snapshots).
 *
 * Safely normalizes raw JSON payloads, legacy unnested `StoryState` objects, missing fields,
 * and partial state maps without altering user progress or game variable semantics.
 *
 * @public
 */
export class StorySaveMigrations {
  /**
   * Migrates and normalizes a raw or legacy narrative save payload into a `NarrativeSaveGame`.
   *
   * @param raw - Raw JSON payload, legacy `StoryState`, or partial `NarrativeSaveGame`.
   * @returns Fully normalized `NarrativeSaveGame` instance.
   */
  public static migrateNarrativeSave(raw: unknown): NarrativeSaveGame {
    const nowIso = new Date().toISOString();

    if (!raw || typeof raw !== "object") {
      return {
        saveVersion: 1,
        contentVersion: "1.0.0",
        story: {
          graphId: null,
          currentNodeId: null,
          flags: {},
          variables: {},
          selectedChoices: [],
          objectives: {},
          evidence: [],
          history: []
        },
        evidence: [],
        relationships: {},
        memories: [],
        timestamp: nowIso
      };
    }

    const obj = raw as Record<string, any>;

    let storyState: StoryState;

    // Check if raw object is a legacy unnested StoryState (or has obj.story)
    if (obj.story && typeof obj.story === "object") {
      storyState = this.normalizeStoryState(obj.story);
    } else {
      storyState = this.normalizeStoryState(obj);
    }

    const evidenceArray = Array.isArray(obj.evidence)
      ? obj.evidence.filter((e): e is string => typeof e === "string")
      : storyState.evidence ?? [];

    const relationships =
      obj.relationships && typeof obj.relationships === "object"
        ? obj.relationships
        : {};

    const memories = Array.isArray(obj.memories) ? obj.memories : [];

    const saveVersion = typeof obj.saveVersion === "number" ? obj.saveVersion : 1;
    const contentVersion = typeof obj.contentVersion === "string" ? obj.contentVersion : "1.0.0";
    const timestamp = typeof obj.timestamp === "string" ? obj.timestamp : nowIso;
    const checkpointId = typeof obj.checkpointId === "string" ? obj.checkpointId : undefined;

    return {
      saveVersion,
      contentVersion,
      story: storyState,
      evidence: evidenceArray,
      relationships,
      memories,
      timestamp,
      ...(checkpointId ? { checkpointId } : {})
    };
  }

  private static normalizeStoryState(rawStory: any): StoryState {
    if (!rawStory || typeof rawStory !== "object") {
      return {
        graphId: null,
        currentNodeId: null,
        flags: {},
        variables: {},
        selectedChoices: [],
        objectives: {},
        evidence: [],
        history: []
      };
    }

    const graphId = typeof rawStory.graphId === "string" ? rawStory.graphId : null;
    const currentNodeId = typeof rawStory.currentNodeId === "string" ? rawStory.currentNodeId : null;

    const flags: Record<string, boolean> = {};
    if (rawStory.flags && typeof rawStory.flags === "object") {
      for (const [k, v] of Object.entries(rawStory.flags)) {
        flags[k] = Boolean(v);
      }
    }

    const variables: Record<string, any> = {};
    if (rawStory.variables && typeof rawStory.variables === "object") {
      for (const [k, v] of Object.entries(rawStory.variables)) {
        variables[k] = v;
      }
    }

    const selectedChoices = Array.isArray(rawStory.selectedChoices)
      ? rawStory.selectedChoices.filter((c: any): c is string => typeof c === "string")
      : [];

    const objectives: Record<string, any> = {};
    if (rawStory.objectives && typeof rawStory.objectives === "object") {
      for (const [k, v] of Object.entries(rawStory.objectives)) {
        if (v && typeof v === "object") {
          objectives[k] = {
            id: typeof (v as any).id === "string" ? (v as any).id : k,
            titleKey: typeof (v as any).titleKey === "string" ? (v as any).titleKey : k,
            descriptionKey: typeof (v as any).descriptionKey === "string" ? (v as any).descriptionKey : undefined,
            targetCount: typeof (v as any).targetCount === "number" ? (v as any).targetCount : 1,
            currentCount: typeof (v as any).currentCount === "number" ? (v as any).currentCount : 0,
            completed: Boolean((v as any).completed)
          };
        }
      }
    }

    const evidence = Array.isArray(rawStory.evidence)
      ? rawStory.evidence.filter((e: any): e is string => typeof e === "string")
      : [];

    const history = Array.isArray(rawStory.history)
      ? rawStory.history.filter((h: any): h is string => typeof h === "string")
      : [];

    return {
      graphId,
      currentNodeId,
      flags,
      variables,
      selectedChoices,
      objectives,
      evidence,
      history
    };
  }
}
