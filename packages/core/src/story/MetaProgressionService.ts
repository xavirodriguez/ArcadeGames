/**
 * Version identifier for MetaProgression save schema.
 *
 * @public
 */
export const META_SAVE_VERSION = 1;

/**
 * Meta evidence item definition persistent across story runs.
 *
 * @public
 */
export interface MetaEvidence {
  readonly id: string;
  readonly titleKey: string;
  readonly category: "glitch" | "timeline_anomaly" | "black_box_layer" | "transmission";
  readonly discoveredAtTimestamp: number;
}

/**
 * Meta progression state separating persistent knowledge/mastery from single-run state.
 *
 * @public
 */
export interface MetaProgressionState {
  readonly saveVersion: number;
  readonly schemaVersion: number;
  readonly contentVersion: string;
  readonly completedRuns: number;
  readonly completedEndings: ReadonlyArray<string>;
  readonly discoveredMetaEvidence: ReadonlyArray<MetaEvidence>;
  readonly unlockedModifiers: ReadonlyArray<string>;
  readonly miniGameMastery: Readonly<Record<string, number>>; // gameId -> mastery level (1-5)
}

/**
 * Storage adapter interface for MetaProgression persistence.
 *
 * @public
 */
export interface IMetaStorageProvider {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}

/**
 * Fallback in-memory storage provider for meta progression state.
 *
 * @public
 */
export class MemoryStorageProvider implements IMetaStorageProvider {
  private store = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

/**
 * Default initial MetaProgressionState.
 *
 * @public
 */
export const DEFAULT_META_PROGRESSION_STATE: MetaProgressionState = {
  saveVersion: META_SAVE_VERSION,
  schemaVersion: 1,
  contentVersion: "1.0.0",
  completedRuns: 0,
  completedEndings: [],
  discoveredMetaEvidence: [],
  unlockedModifiers: ["debris_scanner", "forensic_firewall", "spectral_drone"],
  miniGameMastery: {}
};

/**
 * Service managing MetaProgression state persistence, migrations, and New Game+ unlock logic.
 *
 * @public
 */
export class MetaProgressionService {
  private state: MetaProgressionState;
  private readonly storageKey = "tiny_aster_meta_progression_v1";
  private readonly storage: IMetaStorageProvider;
  private autoSave: boolean;

  constructor(
    initialState: MetaProgressionState = DEFAULT_META_PROGRESSION_STATE,
    storage?: IMetaStorageProvider,
    autoSave: boolean = true
  ) {
    this.storage = storage ?? new MemoryStorageProvider();
    this.autoSave = autoSave;
    this.state = MetaProgressionService.migrateState(initialState);
  }

  /**
   * Toggles automatic I/O persistence on state mutations.
   *
   * @param autoSave - Whether mutations automatically trigger `saveToStorage`.
   */
  public setAutoSave(autoSave: boolean): void {
    this.autoSave = autoSave;
  }

  /**
   * Returns active autoSave status.
   */
  public isAutoSaveEnabled(): boolean {
    return this.autoSave;
  }

  /**
   * Retrieves active read-only MetaProgressionState.
   */
  public getState(): MetaProgressionState {
    return this.state;
  }

  /**
   * Directly replaces in-memory state without performing storage I/O.
   *
   * @param state - The MetaProgressionState to load into memory.
   */
  public loadState(state: MetaProgressionState): void {
    this.state = MetaProgressionService.migrateState(state);
  }

  /**
   * Loads state from storage adapter.
   */
  public async loadFromStorage(): Promise<MetaProgressionState> {
    try {
      const raw = await this.storage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.state = MetaProgressionService.migrateState(parsed);
      }
    } catch {
      // Fallback on current state if load fails
    }
    return this.state;
  }

  /**
   * Saves active state to storage adapter.
   */
  public async saveToStorage(): Promise<void> {
    try {
      await this.storage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      // Storage fallback
    }
  }

  /**
   * Records a completed run and ending for New Game+ progression.
   * Performs auto-save only if `autoSave` is enabled.
   */
  public async recordRunCompletion(endingId: string): Promise<void> {
    const completedRuns = this.state.completedRuns + 1;
    const completedEndings = this.state.completedEndings.includes(endingId)
      ? this.state.completedEndings
      : [...this.state.completedEndings, endingId];

    this.state = {
      ...this.state,
      completedRuns,
      completedEndings
    };

    if (this.autoSave) {
      await this.saveToStorage();
    }
  }

  /**
   * Unlocks meta evidence that persists across story runs.
   * Performs auto-save only if `autoSave` is enabled.
   */
  public async discoverMetaEvidence(metaEvidence: MetaEvidence): Promise<void> {
    if (this.state.discoveredMetaEvidence.some((e) => e.id === metaEvidence.id)) {
      return;
    }

    this.state = {
      ...this.state,
      discoveredMetaEvidence: [...this.state.discoveredMetaEvidence, metaEvidence]
    };

    if (this.autoSave) {
      await this.saveToStorage();
    }
  }

  /**
   * Checks whether player qualifies for New Game+ content branch.
   */
  public isNewGamePlusUnlocked(): boolean {
    return this.state.completedRuns > 0;
  }

  /**
   * Pure migration pipeline for MetaProgression save objects.
   */
  public static migrateState(rawState: unknown): MetaProgressionState {
    if (!rawState || typeof rawState !== "object") {
      return DEFAULT_META_PROGRESSION_STATE;
    }

    const current = { ...(rawState as Record<string, unknown>) };

    // Migration step 0 -> 1 if applicable
    if (typeof current.saveVersion !== "number" || current.saveVersion < 1) {
      current.saveVersion = 1;
      current.schemaVersion = 1;
      current.contentVersion = typeof current.contentVersion === "string" ? current.contentVersion : "1.0.0";
      current.completedRuns = typeof current.completedRuns === "number" ? current.completedRuns : 0;
      current.completedEndings = Array.isArray(current.completedEndings) ? current.completedEndings : [];
      current.discoveredMetaEvidence = Array.isArray(current.discoveredMetaEvidence) ? current.discoveredMetaEvidence : [];
      current.unlockedModifiers = Array.isArray(current.unlockedModifiers) ? current.unlockedModifiers : [];
      current.miniGameMastery = typeof current.miniGameMastery === "object" && current.miniGameMastery ? current.miniGameMastery : {};
    }

    return current as unknown as MetaProgressionState;
  }

  /**
   * Instance migration method delegating to static `migrateState`.
   */
  public migrate(rawState: unknown): MetaProgressionState {
    return MetaProgressionService.migrateState(rawState);
  }
}

/**
 * Pure migration pipeline function for MetaProgression save objects without I/O side effects.
 *
 * @param rawState - Raw JSON or un-migrated MetaProgressionState object.
 * @returns Fully migrated MetaProgressionState object.
 * @public
 */
export function migrateMetaProgressionState(rawState: unknown): MetaProgressionState {
  return MetaProgressionService.migrateState(rawState);
}
