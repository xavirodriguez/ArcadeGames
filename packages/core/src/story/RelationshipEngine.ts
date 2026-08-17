import { CharacterMemory, RelationshipState } from "./StoryTypes";

/**
 * Qualitative character disposition summary descriptor.
 *
 * @public
 */
export interface QualitativeRelationshipStatus {
  /** Summary sentence describing overall stance. */
  summary: string;
  /** List of qualitative descriptor phrases (e.g. 'Confía en ti', 'Teme tus intenciones'). */
  descriptors: string[];
  /** Key memories held by this character. */
  keyMemories: CharacterMemory[];
}

/**
 * Multi-dimensional relationship and memory engine for story characters.
 *
 * @remarks
 * Tracks character memories (choices, lies, promises, betrayals) and multi-dimensional disposition state
 * (trust, fear, respect, suspicion) rather than simple scalar trust values.
 *
 * @public
 */
export class RelationshipEngine {
  private relationships: Map<string, RelationshipState> = new Map();
  private memories: CharacterMemory[] = [];
  private memoryCounter = 0;

  /**
   * Retrieves or initializes default multi-dimensional relationship state for a character.
   *
   * @param characterId - Target character string identifier.
   * @returns Active relationship state snapshot.
   */
  public getRelationship(characterId: string): RelationshipState {
    if (!this.relationships.has(characterId)) {
      this.relationships.set(characterId, {
        trust: 0,
        fear: 0,
        respect: 0,
        suspicion: 0
      });
    }
    return { ...this.relationships.get(characterId)! };
  }

  /**
   * Modifies character relationship metrics by applying delta values.
   *
   * @param characterId - Target character identifier.
   * @param delta - Partial relationship delta values.
   * @returns Updated relationship state snapshot.
   */
  public modifyRelationship(
    characterId: string,
    delta: Partial<RelationshipState>
  ): RelationshipState {
    const current = this.getRelationship(characterId);
    const updated: RelationshipState = {
      trust: current.trust + (delta.trust || 0),
      fear: current.fear + (delta.fear || 0),
      respect: current.respect + (delta.respect || 0),
      suspicion: current.suspicion + (delta.suspicion || 0)
    };
    this.relationships.set(characterId, updated);
    return { ...updated };
  }

  /**
   * Records a discrete interaction memory for a character.
   *
   * @param memory - Character memory descriptor.
   * @returns Recorded character memory with assigned ID and timestamp.
   */
  public addMemory(
    memory: Omit<CharacterMemory, "id"> & { id?: string }
  ): CharacterMemory {
    this.memoryCounter++;
    const fullMemory: CharacterMemory = {
      ...memory,
      id: memory.id || `mem_${this.memoryCounter}`,
      timestamp: memory.timestamp || Date.now()
    };
    this.memories.push(fullMemory);
    return fullMemory;
  }

  /**
   * Checks whether a character retains a specific memory.
   *
   * @param characterId - Character ID.
   * @param type - Memory classification type.
   * @param referenceId - Reference ID (choice ID, evidence ID, etc.).
   * @returns True if character has recorded memory matching criteria.
   */
  public hasMemory(
    characterId: string,
    type: CharacterMemory["type"],
    referenceId: string
  ): boolean {
    return this.memories.some(
      (m) =>
        m.characterId === characterId &&
        m.type === type &&
        m.referenceId === referenceId
    );
  }

  /**
   * Retrieves all recorded memories for a given character.
   *
   * @param characterId - Character ID.
   * @returns List of character memories.
   */
  public getMemoriesForCharacter(characterId: string): CharacterMemory[] {
    return this.memories.filter((m) => m.characterId === characterId);
  }

  /**
   * Generates a qualitative status summary of character stance suitable for UI presentation without raw numbers.
   *
   * @param characterId - Target character string identifier.
   * @returns Qualitative relationship status descriptor.
   */
  public getQualitativeStatus(characterId: string): QualitativeRelationshipStatus {
    const rel = this.getRelationship(characterId);
    const charMemories = this.getMemoriesForCharacter(characterId);

    const descriptors: string[] = [];

    if (rel.trust >= 5) descriptors.push("Confía plenamente en ti");
    else if (rel.trust >= 1) descriptors.push("Confía parcialmente en ti");
    else if (rel.trust <= -5) descriptors.push("Desconfía profundamente de ti");
    else if (rel.trust < 0) descriptors.push("Duda de tus intenciones");

    if (rel.suspicion >= 5) descriptors.push("Sospecha activamente que ocultas información");
    else if (rel.suspicion > 0) descriptors.push("Mantiene recelo sobre tus movimientos");

    if (rel.respect >= 5) descriptors.push("Respeta tus decisiones");
    if (rel.fear >= 5) descriptors.push("Teme tus acciones");

    const summary = descriptors.length > 0
      ? descriptors.join(". ") + "."
      : "Mantiene una postura neutral.";

    return {
      summary,
      descriptors,
      keyMemories: charMemories
    };
  }

  /** Exports complete relationship and memory state for persistence serialization. */
  public exportState(): {
    relationships: Record<string, RelationshipState>;
    memories: CharacterMemory[];
  } {
    const relMap: Record<string, RelationshipState> = {};
    for (const [id, rel] of this.relationships.entries()) {
      relMap[id] = { ...rel };
    }
    return {
      relationships: relMap,
      memories: [...this.memories]
    };
  }

  /** Restores relationship and memory state from serialization snapshot. */
  public importState(data: {
    relationships?: Record<string, RelationshipState>;
    memories?: CharacterMemory[];
  }): void {
    if (data.relationships) {
      for (const [id, rel] of Object.entries(data.relationships)) {
        this.relationships.set(id, { ...rel });
      }
    }
    if (data.memories) {
      this.memories = [...data.memories];
    }
  }
}
