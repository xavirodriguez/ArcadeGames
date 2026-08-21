import { useEffect, useCallback } from "react";
import { InputFrame, ServerUpdatePayload } from "@tiny-aster/core";
import { Room } from "@colyseus/sdk";
import { useMultiplayer } from "@tiny-aster/react-native";

/**
 * Interface representing a game instance capable of network synchronization,
 * client prediction, and server reconciliation.
 *
 * @public
 */
export interface NetworkableGame {
  /** Enables or disables multiplayer replication mode on the game instance. */
  setMultiplayerMode(active: boolean): void;
  /** Applies snapshot state updates received from the server. */
  updateFromServer(state: ServerUpdatePayload | Record<string, unknown>, sessionId?: string): void;
  /** Predicts local player movement/actions using input frames. */
  predictLocalPlayer(input: InputFrame, deltaTime?: number): void;
}

/**
 * Options required for the generic `useMultiplayerGame` hook.
 *
 * @public
 */
export interface UseMultiplayerGameOptions<TGame extends NetworkableGame> {
  /** The active game instance (or null/undefined during loading). */
  game: TGame | null | undefined;
  /** Colyseus room identifier (e.g. "space-invaders", "geometrywars", "asteroids"). */
  roomName: string;
  /** Display name for the local player. */
  playerName: string;
  /** Whether the multiplayer session is active. */
  active: boolean;
  /** Fixed delta time in milliseconds for local prediction steps (defaults to 16.66ms). */
  predictionDeltaMs?: number;
}

/**
 * Result returned by the generic `useMultiplayerGame` hook.
 *
 * @public
 */
export interface UseMultiplayerGameResult<TInput = Record<string, boolean>> {
  /** Colyseus room instance or null if disconnected. */
  room: Room | null;
  /** Network connection status flag. */
  connected: boolean;
  /** Active server state snapshot or delta payload. */
  serverState: ServerUpdatePayload | Record<string, unknown> | null;
  /**
   * Sends input to the network room and triggers immediate local prediction on the game instance.
   *
   * @param input - Map of action flags or axis values to send.
   * @returns The generated `InputFrame` or null if disconnected/inactive.
   */
  handleMultiplayerInput: (input: Partial<TInput>) => InputFrame | null;
}

/**
 * Generic custom hook for managing multiplayer connectivity, state replication,
 * client-side prediction, and input reconciliation across arcade minigames.
 *
 * @typeParam TGame - Game implementation extending `NetworkableGame`.
 * @typeParam TInput - Map of input action flags and axis values.
 *
 * @param options - Configuration options for the multiplayer session.
 * @returns Object containing room connection state and multiplayer input dispatcher.
 *
 * @public
 */
export function useMultiplayerGame<
  TGame extends NetworkableGame,
  TInput = Record<string, boolean>
>({
  game,
  roomName,
  playerName,
  active,
  predictionDeltaMs = 16.66,
}: UseMultiplayerGameOptions<TGame>): UseMultiplayerGameResult<TInput> {
  const { room, connected, serverState, sendInput, inputBufferRef } = useMultiplayer(
    roomName,
    playerName,
    active
  );

  // 1. Synchronize multiplayer mode on game instance
  useEffect(() => {
    if (active && connected && game) {
      game.setMultiplayerMode(true);
    }
  }, [active, connected, game]);

  // 2. Apply server state updates & replay pending inputs for reconciliation
  useEffect(() => {
    if (active && serverState && game) {
      const sessionId = room?.sessionId;
      const pendingInputs = inputBufferRef.current;

      game.updateFromServer(serverState, sessionId);

      if (sessionId && pendingInputs.length > 0) {
        pendingInputs.forEach((frame) => {
          game.predictLocalPlayer(frame, predictionDeltaMs);
        });
      }
    }
  }, [active, serverState, game, room?.sessionId, inputBufferRef, predictionDeltaMs]);

  // 3. Unified input sender and local predictor
  const handleMultiplayerInput = useCallback(
    (input: Partial<TInput>): InputFrame | null => {
      if (!active || !room || !connected) {
        return null;
      }

      const frame = sendInput(input as Record<string, unknown>);
      if (frame && game) {
        game.predictLocalPlayer(frame, predictionDeltaMs);
      }
      return frame;
    },
    [active, room, connected, sendInput, game, predictionDeltaMs]
  );

  return {
    room,
    connected,
    serverState,
    handleMultiplayerInput,
  };
}
