import { StoryGraph, StoryPackage } from "./StoryTypes";
import { StoryGraphValidationOptions } from "./StoryGraphValidator";

/**
 * Entry holding metadata and graph retrieval details for registry entries.
 * @public
 */
export interface RegisteredGraphEntry {
  /** Unique graph identifier. */
  id: string;
  /** Human readable label or source location file path. */
  source: string;
  /** Getter function returning the StoryGraph definition. */
  getGraph: () => StoryGraph;
  /** Whether this entry represents a dynamic JSON package asset or static TS fallback. */
  isDynamic?: boolean;
  /** Optional graph validation options (declared flags/variables) for linting. */
  options?: StoryGraphValidationOptions;
  /** Optional encounters associated with the graph for semantic DSL linting. */
  encounters?: unknown[];
}

/**
 * Central registry managing static TypeScript fallbacks and dynamically registered `StoryPackage` assets.
 *
 * @remarks
 * Enables graph lookups by ID with resolution order prioritizing dynamically loaded JSON package graphs over
 * hardcoded static TypeScript graph definitions.
 *
 * @public
 */
export class StoryGraphRegistry {
  private static instance: StoryGraphRegistry | null = null;

  private staticEntries = new Map<string, RegisteredGraphEntry>();
  private dynamicPackages = new Map<string, StoryPackage>();
  private dynamicGraphToPackage = new Map<string, { pkgId: string; graph: StoryGraph }>();

  /**
   * Retrieves the global singleton instance of `StoryGraphRegistry`.
   *
   * @returns Global `StoryGraphRegistry` singleton.
   */
  public static getInstance(): StoryGraphRegistry {
    if (!StoryGraphRegistry.instance) {
      StoryGraphRegistry.instance = new StoryGraphRegistry();
    }
    return StoryGraphRegistry.instance;
  }

  /**
   * Clears all registered static and dynamic graphs from the global singleton.
   */
  public static resetInstance(): void {
    if (StoryGraphRegistry.instance) {
      StoryGraphRegistry.instance.clear();
      StoryGraphRegistry.instance = null;
    }
  }

  /**
   * Registers a static TypeScript `StoryGraph` as a fallback definition.
   *
   * @param graph - The static StoryGraph instance.
   * @param sourceFile - Optional source file annotation for debugging or linting.
   * @param options - Optional validation rules (declared flags/vars).
   * @param encounters - Optional associated encounter definitions.
   */
  public registerStaticGraph(
    graph: StoryGraph,
    sourceFile: string = "TypeScript",
    options?: StoryGraphValidationOptions,
    encounters?: unknown[]
  ): void {
    if (!graph || !graph.id) return;
    this.staticEntries.set(graph.id, {
      id: graph.id,
      source: sourceFile,
      getGraph: () => graph,
      isDynamic: false,
      options,
      encounters
    });
  }

  /**
   * Registers a loaded dynamic `StoryPackage` in the registry.
   *
   * @param pkg - The migrated and validated StoryPackage instance.
   */
  public registerDynamicPackage(pkg: StoryPackage): void {
    if (!pkg || !pkg.manifest || !pkg.manifest.id) return;
    this.dynamicPackages.set(pkg.manifest.id, pkg);

    if (pkg.graphs) {
      for (const [graphId, graph] of Object.entries(pkg.graphs)) {
        this.dynamicGraphToPackage.set(graphId, {
          pkgId: pkg.manifest.id,
          graph
        });
      }
    }
  }

  /**
   * Unregisters a dynamic `StoryPackage` by package ID.
   *
   * @param packageId - Package identifier to remove.
   */
  public unregisterDynamicPackage(packageId: string): void {
    if (!this.dynamicPackages.has(packageId)) return;

    this.dynamicPackages.delete(packageId);
    for (const [graphId, entry] of Array.from(this.dynamicGraphToPackage.entries())) {
      if (entry.pkgId === packageId) {
        this.dynamicGraphToPackage.delete(graphId);
      }
    }
  }

  /**
   * Retrieves a `StoryGraph` by ID, prioritizing dynamically registered package graphs over static TS definitions.
   *
   * @param graphId - The unique identifier of the desired story graph.
   * @returns The resolved `StoryGraph` or `undefined` if no matching graph is registered.
   */
  public getGraph(graphId: string): StoryGraph | undefined {
    // Priority 1: Dynamic packages
    const dynamicEntry = this.dynamicGraphToPackage.get(graphId);
    if (dynamicEntry) {
      return dynamicEntry.graph;
    }

    // Priority 2: Static TS fallbacks
    const staticEntry = this.staticEntries.get(graphId);
    if (staticEntry) {
      return staticEntry.getGraph();
    }

    return undefined;
  }

  /**
   * Retrieves a registered `StoryPackage` by manifest package ID or graph ID.
   *
   * @param packageId - Unique package or graph identifier.
   * @returns The registered `StoryPackage` or `undefined`.
   */
  public getPackage(packageId: string): StoryPackage | undefined {
    if (this.dynamicPackages.has(packageId)) {
      return this.dynamicPackages.get(packageId);
    }
    const dynamicEntry = this.dynamicGraphToPackage.get(packageId);
    if (dynamicEntry) {
      return this.dynamicPackages.get(dynamicEntry.pkgId);
    }
    return undefined;
  }

  /**
   * Returns all registered static graph entries.
   *
   * @returns Array of registered static graph entries.
   */
  public getStaticEntries(): RegisteredGraphEntry[] {
    return Array.from(this.staticEntries.values());
  }

  /**
   * Returns all registered dynamic `StoryPackage` definitions.
   *
   * @returns Array of registered StoryPackages.
   */
  public getDynamicPackages(): StoryPackage[] {
    return Array.from(this.dynamicPackages.values());
  }

  /**
   * Clears all registered static and dynamic graphs.
   */
  public clear(): void {
    this.staticEntries.clear();
    this.dynamicPackages.clear();
    this.dynamicGraphToPackage.clear();
  }
}
