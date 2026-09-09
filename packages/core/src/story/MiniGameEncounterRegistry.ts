import { MiniGameEncounter } from "./ArcadeIntegrationTypes";

/**
 * Registry for dynamic lookup and management of narrative minigame encounters.
 *
 * @remarks
 * Supports resolving encounters either by unique `encounterId` or by fallback `gameId`.
 *
 * @public
 */
export class MiniGameEncounterRegistry {
  private encountersById = new Map<string, MiniGameEncounter>();
  private encountersByGameId = new Map<string, MiniGameEncounter>();

  /**
   * Registers a minigame encounter definition.
   *
   * @param encounter - MiniGameEncounter object to register.
   */
  public register(encounter: MiniGameEncounter): void {
    if (encounter.id) {
      this.encountersById.set(encounter.id, encounter);
    }
    if (encounter.gameId) {
      this.encountersByGameId.set(encounter.gameId, encounter);
    }
  }

  /**
   * Resolves a minigame encounter by encounter ID or fallback game ID.
   *
   * @param gameId - Normalized minigame ID (e.g. "asteroids", "space-invaders", "flappybird").
   * @param encounterId - Optional encounter ID specified in story node metadata.
   * @returns Resolved MiniGameEncounter instance.
   * @throws Error if no matching encounter is registered.
   */
  public resolve(gameId: string, encounterId?: string): MiniGameEncounter {
    if (encounterId && this.encountersById.has(encounterId)) {
      return this.encountersById.get(encounterId)!;
    }

    if (this.encountersByGameId.has(gameId)) {
      return this.encountersByGameId.get(gameId)!;
    }

    throw new Error(
      `[MiniGameEncounterRegistry] Unable to resolve encounter for gameId '${gameId}' (encounterId: '${encounterId ?? "none"}').`
    );
  }
}
