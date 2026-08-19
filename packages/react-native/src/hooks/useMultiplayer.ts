/**
 * React hook for managing multiplayer connectivity and state synchronization.
 *
 * This hook encapsulates the complexity of connecting to Colyseus rooms,
 * handling server messages, and notifying the React component tree of state updates.
 *
 * @packageDocumentation
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { ColyseusTransport } from "@tiny-aster/network-colyseus";
import { Room } from "@colyseus/sdk";
import { InputFrame, BinaryCompression } from "@tiny-aster/core";

/**
 * Manages the network lifecycle for a game session.
 *
 * @param roomName - The name of the game room to join.
 * @param playerName - Display name for the player.
 * @param active - If false, the hook will disconnect and cleanup.
 */
export function useMultiplayer(roomName: string, playerName: string, active: boolean) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [serverState, setServerState] = useState<any>(null);
  const cancelledRef = useRef(false);

  const localTickRef = useRef(0);
  const serverTickRef = useRef(0);
  const lastProcessedTickRef = useRef(0);
  const lastAckedVersionRef = useRef(0);
  const inputBufferRef = useRef<InputFrame[]>([]);

  const persistentInputRef = useRef<{
    actions: Set<string>;
    axes: Record<string, number>;
  }>({
    actions: new Set(),
    axes: {},
  });

  useEffect(() => {
    if (!active || !playerName) return;

    cancelledRef.current = false;
    const connection = new ColyseusTransport(roomName, { name: playerName });

    async function setup() {
      try {
        const endpoint = process.env.EXPO_PUBLIC_COLYSEUS_URL ?? "ws://127.0.0.1:2567";
        await connection.connect(endpoint);
        const joinedRoom = connection.getRoom();
        if (cancelledRef.current) {
          connection.disconnect();
          return;
        }

        if (!joinedRoom) return;

        setRoom(joinedRoom);
        setConnected(true);
        setServerState(joinedRoom.state);

        joinedRoom.onStateChange((state: any) => {
          setServerState({ ...state }); // Spread ensures React re-renders even if object reference is reused
          if (state.serverTick) {
            serverTickRef.current = state.serverTick;
          }
          if (state.lastProcessedTick) {
            lastProcessedTickRef.current = state.lastProcessedTick;
            // Clear old inputs from buffer
            inputBufferRef.current = inputBufferRef.current.filter(f => f.tick > state.lastProcessedTick);
          }
        });

        /**
         * Clock Synchronization & Latency Estimation.
         *
         * @remarks
         * Calculates the Round Trip Time (RTT) to align the local simulation tick with the server.
         * The client maintains a "lead" (temporal offset) relative to the server to ensure that
         * its input frames arrive at the backend BEFORE the server attempts to process that tick.
         *
         * ### Synchronization Formula:
         * `Local Tick = Server Tick + (RTT / 2 / FrameDuration) + TICK_BUFFER`
         *
         * - **RTT / 2**: Estimated one-way latency (ms).
         * - **FrameDuration**: 16.66ms for 60 FPS target.
         * - **TICK_BUFFER**: Safety margin (2 frames) to absorb network Jitter.
         */
        joinedRoom.onMessage("sync_tick", (data: { serverTick: number, timestamp: number }) => {
            const now = Date.now();
            const rawRtt = now - (data?.timestamp ?? now);
            // Sanitize RTT against negative values, NaN, or extreme clock skew spikes
            const rtt = (!isNaN(rawRtt) && isFinite(rawRtt) && rawRtt >= 0 && rawRtt <= 10000) ? rawRtt : 50;

            // 16.66ms is the duration of a 60fps frame.
            const FRAME_DURATION = 16.66;
            // Buffer of 2 frames to account for jitter.
            const TICK_BUFFER = 2;

            const validServerTick = typeof data?.serverTick === "number" && !isNaN(data.serverTick) && isFinite(data.serverTick) && data.serverTick >= 0
              ? data.serverTick
              : serverTickRef.current;
            const targetLocalTick = validServerTick + Math.ceil((rtt / 2) / FRAME_DURATION) + TICK_BUFFER;

            // Prevent local tick from jumping backwards if packets arrive out of order
            localTickRef.current = Math.max(localTickRef.current, targetLocalTick);
            console.log(`Synced tick: server=${validServerTick}, local=${localTickRef.current}, rtt=${rtt}`);
        });

        /**
         * Handles JSON-based delta state updates.
         * Extracts the world state version for acknowledgment.
         */
        joinedRoom.onMessage("world_delta", (data: { tick: number, delta: string }) => {
            if (data.tick <= lastProcessedTickRef.current) return;
            try {
                const deltaObj = JSON.parse(data.delta);
                let versionChanged = false;
                if (deltaObj.stateVersion !== undefined && deltaObj.stateVersion !== lastAckedVersionRef.current) {
                    lastAckedVersionRef.current = deltaObj.stateVersion;
                    versionChanged = true;
                }
                // Forward parsed delta to avoid double parsing in the game
                setServerState({ delta: deltaObj, tick: data.tick });

                // Acknowledge version if it changed
                if (versionChanged) {
                    joinedRoom.send("sync_tick", {
                        timestamp: Date.now(),
                        lastAckedVersion: lastAckedVersionRef.current
                    });
                }
            } catch (e) {
                console.error("[useMultiplayer] Failed to parse world_delta:", e);
            }
        });

        joinedRoom.onMessage("world_delta_bin", (data: Uint8Array) => {
            try {
                const deltaPacket = BinaryCompression.unpack<{ tick?: number, stateVersion?: number }>(data);
                if (deltaPacket.tick !== undefined && deltaPacket.tick <= lastProcessedTickRef.current) return;

                let versionChanged = false;
                if (deltaPacket.stateVersion !== undefined && deltaPacket.stateVersion !== lastAckedVersionRef.current) {
                    lastAckedVersionRef.current = deltaPacket.stateVersion;
                    versionChanged = true;
                }
                setServerState({ delta: deltaPacket, tick: deltaPacket.tick || serverTickRef.current });

                if (versionChanged) {
                    joinedRoom.send("sync_tick", {
                        timestamp: Date.now(),
                        lastAckedVersion: lastAckedVersionRef.current
                    });
                }
            } catch (e) {
                console.error("[useMultiplayer] Failed to unpack binary delta:", e);
            }
        });

        joinedRoom.send("sync_tick", {
            protocolVersion: 1,
            timestamp: Date.now(),
            lastAckedVersion: lastAckedVersionRef.current
        });

        joinedRoom.onLeave((_code: any) => {
          setConnected(false);
          setRoom(null);
        });

      } catch (e) {
        console.error("Failed to connect to multiplayer room:", e);
      }
    }

    setup();

    return () => {
      cancelledRef.current = true;
      connection.disconnect();
      setConnected(false);
      setRoom(null);
    };
  }, [roomName, playerName, active]);

  const sendInput = useCallback((input: Record<string, any>) => {
    if (!room || !connected) return null;

    // Convert legacy flat input fields into the generic Set and Record structure
    if (input.thrust !== undefined) {
      if (input.thrust) {
        persistentInputRef.current.actions.add("thrust");
        persistentInputRef.current.axes["thrust"] = 1;
      } else {
        persistentInputRef.current.actions.delete("thrust");
        persistentInputRef.current.axes["thrust"] = 0;
      }
    }
    if (input.rotateLeft !== undefined) {
      if (input.rotateLeft) {
        persistentInputRef.current.actions.add("rotateLeft");
        persistentInputRef.current.axes["rotate_left"] = 1;
      } else {
        persistentInputRef.current.actions.delete("rotateLeft");
        persistentInputRef.current.axes["rotate_left"] = 0;
      }
    }
    if (input.rotateRight !== undefined) {
      if (input.rotateRight) {
        persistentInputRef.current.actions.add("rotateRight");
        persistentInputRef.current.axes["rotate_right"] = 1;
      } else {
        persistentInputRef.current.actions.delete("rotateRight");
        persistentInputRef.current.axes["rotate_right"] = 0;
      }
    }
    if (input.rotationAmount !== undefined) {
      persistentInputRef.current.axes["rotate_x"] = input.rotationAmount;
    }
    if (input.shoot !== undefined) {
      if (input.shoot) {
        persistentInputRef.current.actions.add("shoot");
      } else {
        persistentInputRef.current.actions.delete("shoot");
      }
    }
    if (input.hyperspace !== undefined) {
      if (input.hyperspace) {
        persistentInputRef.current.actions.add("hyperspace");
      } else {
        persistentInputRef.current.actions.delete("hyperspace");
      }
    }

    if (input.moveLeft !== undefined || input.moveRight !== undefined) {
      const ml = input.moveLeft !== undefined ? input.moveLeft : persistentInputRef.current.axes["moveX"] === -1;
      const mr = input.moveRight !== undefined ? input.moveRight : persistentInputRef.current.axes["moveX"] === 1;
      let moveX = 0;
      if (ml) moveX -= 1;
      if (mr) moveX += 1;
      persistentInputRef.current.axes["moveX"] = moveX;
    }

    // Also support direct generic actions and axes parameters
    if (input.actions) {
      for (const action of input.actions) {
        persistentInputRef.current.actions.add(action);
      }
    }
    if (input.axes) {
      for (const [key, val] of Object.entries(input.axes)) {
        persistentInputRef.current.axes[key] = val as number;
      }
    }

    if (localTickRef.current % 10 === 0) {
        room.send("sync_tick", {
            protocolVersion: 1,
            timestamp: Date.now(),
            lastAckedVersion: lastAckedVersionRef.current
        });
    }

    localTickRef.current++;
    const merged = persistentInputRef.current;

    const frame: InputFrame = {
        protocolVersion: 1,
        tick: localTickRef.current,
        timestamp: Date.now(),
        actions: Array.from(merged.actions),
        axes: { ...merged.axes }
    };

    room.send("input", frame);
    inputBufferRef.current.push(frame);
    if (inputBufferRef.current.length > 120) inputBufferRef.current.shift();

    // Clear discrete/accumulated actions after sending
    persistentInputRef.current.actions.delete("shoot");
    persistentInputRef.current.actions.delete("hyperspace");

    return frame;
  }, [room, connected]);

  return {
    room,
    connected,
    serverState,
    sendInput,
    localTickRef,
    inputBufferRef,
    lastProcessedTickRef
  };
}
