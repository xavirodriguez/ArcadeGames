import { GameDefinition } from "./GameDefinition";

/**
 * Registry mapping `GameId` identifiers to `GameDefinition` factory contracts.
 *
 * @remarks
 * Decouples game definition resolution from direct subclass constructors.
 * The simulation instance is produced via `definition.createSimulation(seed)`.
 *
 * @public
 */
export class GameDefinitionRegistry {
  private static definitions = new Map<string, GameDefinition>();

  /**
   * Normalizes raw or legacy game identifiers into canonical format.
   *
   * @param id - Raw string identifier.
   * @returns Normalized string key.
   * @public
   */
  public static normalizeId(id: string): string {
    const lower = id.toLowerCase().trim().replace(/_/g, "-");
    if (lower === "echo-runner") return "echorunner";
    if (lower === "flappy-bird") return "flappybird";
    if (lower === "geometry-wars") return "geometrywars";
    return lower;
  }

  /**
   * Registers a `GameDefinition` instance for the given identifier.
   *
   * @param id - Gameplay identifier (e.g. `"asteroids"`, `"space-invaders"`).
   * @param definition - The `GameDefinition` contract implementation.
   * @public
   */
  public static register(id: string, definition: GameDefinition): void {
    const key = this.normalizeId(id);
    this.definitions.set(key, definition);
  }

  /**
   * Resolves and returns the `GameDefinition` for the given gameplay identifier.
   *
   * @param id - Gameplay string identifier.
   * @returns The registered `GameDefinition`.
   * @throws Error if no definition is registered for `id`.
   * @public
   */
  public static resolve(id: string): GameDefinition {
    const key = this.normalizeId(id);
    const def = this.definitions.get(key);
    if (!def) {
      const available = Array.from(this.definitions.keys()).join(", ");
      throw new Error(`[GameDefinitionRegistry] Unknown gameId "${id}". Registered definitions: [${available}]`);
    }
    return def;
  }

  /**
   * Checks whether a `GameDefinition` is registered for the given identifier.
   *
   * @param id - Gameplay string identifier.
   * @returns `true` if registered, `false` otherwise.
   * @public
   */
  public static has(id: string): boolean {
    return this.definitions.has(this.normalizeId(id));
  }

  /**
   * Returns all currently registered game identifiers.
   *
   * @returns Array of registered string identifiers.
   * @public
   */
  public static getRegisteredIds(): string[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Clears all registered definitions (primarily for testing).
   *
   * @public
   */
  public static clear(): void {
    this.definitions.clear();
  }
}
