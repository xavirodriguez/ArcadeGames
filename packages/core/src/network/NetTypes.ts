import { z } from "zod";
import { WorldSnapshot } from "../snapshots/WorldSnapshot";

/**
 * Represents a single tick of user input.
 * @public
 */
export const InputFrameSchema = z.object({
  /** Network protocol version. */
  protocolVersion: z.number().optional(),
  /** The simulation tick this input belongs to. */
  tick: z.number().int().nonnegative(),
  /** Wall-clock time when the input was captured. */
  timestamp: z.number().optional(),
  /** List of semantic actions active (e.g., "shoot", "thrust"). */
  actions: z.array(z.string()),
  /** Continuous input values (e.g., joystick coordinates). */
  axes: z.record(z.string(), z.number())
});

/**
 * Type of a single tick of user input.
 * @public
 */
export type InputFrame = z.infer<typeof InputFrameSchema>;

/**
 * Historical state of an entity used for reconciliation.
 * @public
 */
export interface PredictedState {
  /** The simulation tick for this state. */
  tick: number;
  /** Unique identifier of the entity. */
  entityId: string;
  /** Physical state at this tick. */
  state: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle?: number;
  };
  /** List of entity IDs active at this tick. */
  entities: string[];
}

/**
 * Captured visual state for interpolation.
 * @public
 */
export interface EntitySnapshot {
  /** The server or simulation tick this snapshot represents. */
  tick: number;
  /** World X position. */
  x: number;
  /** World Y position. */
  y: number;
  /** Rotation in radians. */
  angle?: number;
  /** Wall-clock time when the state was received or captured. */
  timestamp: number;
}

/**
 * Single tick frame payload stored within a session replay recording.
 *
 * @example
 * ```ts
 * const frame: ReplayFrame = {
 *   tick: 120,
 *   inputs: { player_1: [] },
 *   events: ["enemy:spawned"]
 * };
 * ```
 *
 * @public
 */
export interface ReplayFrame {
  /** Simulation tick number for this frame. */
  tick: number;
  /** Player inputs indexed by session/client ID. */
  inputs: Record<string, InputFrame[]>;
  /** Key events emitted during this frame. */
  events: string[];
}

/**
 * Complete recorded session replay archive data.
 *
 * @example
 * ```ts
 * const replay: ReplayData = {
 *   version: 1,
 *   roomId: "room_01",
 *   startTick: 0,
 *   endTick: 300,
 *   frames: []
 * };
 * ```
 *
 * @public
 */
export interface ReplayData {
  /** Replay schema version number. */
  version: number;
  /** Server room identifier. */
  roomId: string;
  /** Starting simulation tick. */
  startTick: number;
  /** Final ending simulation tick. */
  endTick: number;
  /** Chronological array of replay frames. */
  frames: ReplayFrame[];
}

/**
 * Full authoritative world snapshot payload sent from server to client.
 *
 * @example
 * ```ts
 * const fullPayload: FullSnapshotPayload = {
 *   kind: "full",
 *   serverTick: 250,
 *   fullWorldState: snapshot
 * };
 * ```
 *
 * @public
 */
export interface FullSnapshotPayload {
  /** Discriminator tag identifying payload as a full snapshot. */
  kind: "full";
  /** Authoritative server simulation tick. */
  serverTick: number;
  /** Complete serialized world state snapshot. */
  fullWorldState: WorldSnapshot;
  /** Optional local client session identifier. */
  localSessionId?: string;
}

/**
 * Delta world snapshot update payload sent from server to client.
 *
 * @example
 * ```ts
 * const deltaPayload: DeltaSnapshotPayload = {
 *   kind: "delta",
 *   tick: 251,
 *   delta: { tick: 251, entities: [1, 2] }
 * };
 * ```
 *
 * @public
 */
export interface DeltaSnapshotPayload {
  /** Discriminator tag identifying payload as a delta snapshot. */
  kind: "delta";
  /** Target simulation tick for this delta. */
  tick: number;
  /** Partial snapshot containing state mutations since previous baseline. */
  delta: Partial<WorldSnapshot>;
  /** Optional local client session identifier. */
  localSessionId?: string;
}

/**
 * Union type representing authoritative server network state update payloads.
 *
 * @public
 */
export type ServerUpdatePayload = FullSnapshotPayload | DeltaSnapshotPayload;
