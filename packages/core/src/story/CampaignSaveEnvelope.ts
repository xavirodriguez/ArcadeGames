import { NarrativeSaveGame } from "./StoryTypes";
import { MetaProgressionState } from "./MetaProgressionService";

/**
 * Current active campaign save envelope format schema version.
 *
 * @public
 */
export const CURRENT_CAMPAIGN_ENVELOPE_VERSION = 1;

/**
 * Serialized envelope containing unified campaign narrative, meta progression, and session stats.
 *
 * @public
 */
export interface CampaignSaveEnvelopeV1 {
  /** Envelope format schema version (fixed at 1 for V1). */
  readonly schemaVersion: 1;
  /** Storage slot string identifier (e.g., "slot_1"). */
  readonly slotId: string;
  /** High precision epoch timestamp when save was written. */
  readonly updatedAt: number;

  /** Full narrative save state snapshot. */
  readonly narrative: NarrativeSaveGame;
  /** Full meta progression state snapshot. */
  readonly meta: MetaProgressionState;

  /** Active minigame identifier at time of save. */
  readonly activeGameId?: string;
  /** Seed used to initialize active minigame simulation. */
  readonly activeGameSeed?: number;

  /** Campaign performance and play statistics. */
  readonly stats: {
    /** Accumulated total playtime across active campaign session in seconds. */
    readonly totalPlaytimeSeconds: number;
    /** Lookup table of minigame IDs to total play/completion counts. */
    readonly minigamesPlayed: Record<string, number>;
  };
}

/**
 * Union type for all supported versioned campaign save envelopes.
 *
 * @public
 */
export type CampaignSaveEnvelope = CampaignSaveEnvelopeV1;
