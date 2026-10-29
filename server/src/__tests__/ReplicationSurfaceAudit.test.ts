import {
  World,
  SnapshotSerializer,
  SnapshotSerializerSoA,
  hashAoS,
  hashSoA,
  MultiplayerReconciler,
  SnapshotBuffer,
  Simulation,
  NetworkBudgetManager,
  ClientAckTracker,
  ReplicationStateTracker,
  NetworkDeltaSystem,
  Component
} from "@tiny-aster/core";
import { AsteroidsRoom } from "../AsteroidsRoom";
import { LegacyReplicationStrategy } from "../replication/LegacyReplicationStrategy";
import { InterestReplicationStrategy } from "../replication/InterestReplicationStrategy";
import { BinaryReplicationStrategy } from "../replication/BinaryReplicationStrategy";
import { DeltaReplicationStrategy } from "../replication/DeltaReplicationStrategy";
import { type Client } from "@colyseus/core";

interface InputTestComponent extends Component {
  type: "Input";
  actions: string[];
  axes: Record<string, number>;
}

interface RoomWithInternals {
  state: { gameStarted: boolean };
  world: World;
  ackTracker: ClientAckTracker;
  deltaSystem: NetworkDeltaSystem;
  budgetManager: NetworkBudgetManager;
  inputBuffers: Map<string, Array<{ protocolVersion: number; tick: number; timestamp: number; actions: string[]; axes: Record<string, number> }>>;
  onMessage: jest.Mock;
  onCreate(options: unknown): Promise<void>;
  onJoin(client: Client, options: unknown): void;
  update(dt: number): void;
  onDispose(): void;
  setState(state: unknown): void;
  setPatchRate(rate: number): void;
  setSimulationInterval(cb: (dt: number) => void): void;
  broadcast(event: string, data: unknown): void;
}

describe("S4 Replication Surface Audit Tests & Measurements", () => {
  describe("4.1 Hash characterization (Input.actions difference)", () => {
    it("should produce different hashes when two worlds differ ONLY in Input.actions (AoS and SoA)", () => {
      const w1 = new World();
      const e1 = w1.createEntity();
      w1.addComponent(e1, {
        type: "Transform",
        x: 100,
        y: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 200,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      w1.addComponent(e1, {
        type: "Velocity",
        vx: 10,
        vy: 0,
        angularVelocity: 0
      });
      w1.addComponent(e1, {
        type: "Input",
        actions: ["thrust"],
        axes: { moveX: 1 }
      } as InputTestComponent as never);

      const w2 = new World();
      const e2 = w2.createEntity();
      w2.addComponent(e2, {
        type: "Transform",
        x: 100,
        y: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 200,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      w2.addComponent(e2, {
        type: "Velocity",
        vx: 10,
        vy: 0,
        angularVelocity: 0
      });
      w2.addComponent(e2, {
        type: "Input",
        actions: ["fire"], // Differing actions
        axes: { moveX: 1 }
      } as InputTestComponent as never);

      // 1. AoS Snapshots & Hashes
      const aos1 = SnapshotSerializer.snapshot(w1);
      const aos2 = SnapshotSerializer.snapshot(w2);
      const hashAoS1 = hashAoS(aos1);
      const hashAoS2 = hashAoS(aos2);

      expect(hashAoS1).not.toEqual(hashAoS2);

      // 2. SoA Snapshots & Hashes
      const soa1 = SnapshotSerializerSoA.snapshot(w1);
      const soa2 = SnapshotSerializerSoA.snapshot(w2);
      const hashSoA1 = hashSoA(soa1);
      const hashSoA2 = hashSoA(soa2);

      expect(hashSoA1).not.toEqual(hashSoA2);

      console.log(`[4.1 Hash Test] AoS Hash 1: ${hashAoS1}, AoS Hash 2: ${hashAoS2} (Different? ${hashAoS1 !== hashAoS2})`);
      console.log(`[4.1 Hash Test] SoA Hash 1: ${hashSoA1}, SoA Hash 2: ${hashSoA2} (Different? ${hashSoA1 !== hashSoA2})`);
    });
  });

  describe("4.5 Divergence characterization", () => {
    it("should treat differing transient Input as a state divergence during reconciliation", () => {
      const serverWorld = new World();
      const serverEntity = serverWorld.createEntity();
      serverWorld.addComponent(serverEntity, {
        type: "Transform",
        x: 100,
        y: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 200,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      serverWorld.addComponent(serverEntity, {
        type: "Velocity",
        vx: 10,
        vy: 0,
        angularVelocity: 0
      });
      serverWorld.addComponent(serverEntity, {
        type: "Input",
        actions: [], // Confirmed input on server
        axes: {}
      } as InputTestComponent as never);

      const clientWorld = new World();
      const clientEntity = clientWorld.createEntity();
      clientWorld.addComponent(clientEntity, {
        type: "Transform",
        x: 100,
        y: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 200,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      clientWorld.addComponent(clientEntity, {
        type: "Velocity",
        vx: 10,
        vy: 0,
        angularVelocity: 0
      });
      clientWorld.addComponent(clientEntity, {
        type: "Input",
        actions: ["thrust"], // Locally predicted input on client
        axes: { moveX: 1 }
      } as InputTestComponent as never);

      // Simulation adapter for client
      let restoredCount = 0;
      const simAdapter: Simulation = {
        get tick() { return clientWorld.tick; },
        get state() { return {}; },
        step() { clientWorld.advanceTick(); },
        snapshot() { return clientWorld.snapshot(); },
        restore(snap) {
          clientWorld.restore(snap);
          restoredCount++;
        },
        hash() {
          const snap = SnapshotSerializer.snapshot(clientWorld);
          return hashAoS(snap);
        }
      };

      const buffer = new SnapshotBuffer(60);
      const reconciler = new MultiplayerReconciler(simAdapter, buffer);

      const tick = 10;
      // Client logs prediction at tick 10
      const clientSnap = SnapshotSerializer.snapshot(clientWorld);
      const clientHash = hashAoS(clientSnap);
      reconciler.logPrediction(tick, { t: tick, b: 1 }, clientHash);

      // Server generates snapshot and hash at tick 10
      const serverSnap = SnapshotSerializer.snapshot(serverWorld);
      const serverHash = hashAoS(serverSnap);

      expect(clientHash).not.toEqual(serverHash);

      // Reconcile
      reconciler.reconcile(tick, serverSnap, serverHash, tick);

      // Verify that reconciliation restored server snapshot because local hash !== server hash
      expect(restoredCount).toBe(1);
      console.log(`[4.5 Divergence Test] Client Hash: ${clientHash}, Server Hash: ${serverHash}. Reconciliation restored state? ${restoredCount === 1}`);
    });
  });

  describe("4.4 Replication Byte Measurements (N=2 and N=8)", () => {
    async function setupAsteroidsRoomAndMeasure(numPlayers: number) {
      const room = new AsteroidsRoom();
      const internalRoom = room as never as RoomWithInternals;

      internalRoom.setState = jest.fn((state: unknown) => {
        (room as never as { state: unknown }).state = state;
      });
      internalRoom.setPatchRate = jest.fn();
      internalRoom.setSimulationInterval = jest.fn();
      internalRoom.onMessage = jest.fn();
      internalRoom.broadcast = jest.fn();

      await internalRoom.onCreate({ seed: 12345 });

      // Equip room with replication systems/trackers
      const tracker = new ReplicationStateTracker();
      internalRoom.ackTracker = new ClientAckTracker();
      internalRoom.deltaSystem = new NetworkDeltaSystem(tracker);
      internalRoom.budgetManager = new NetworkBudgetManager();

      const clients: Client[] = Array.from({ length: numPlayers }, (_, i) => {
        const clientObj = {
          sessionId: `sess_${i}`,
          send: jest.fn()
        } as never as Client;
        internalRoom.onJoin(clientObj, { name: `Player_${i}` });
        return clientObj;
      });

      internalRoom.state.gameStarted = true;

      // Run simulation up to tick 10
      for (let t = 1; t <= 10; t++) {
        clients.forEach((client, idx) => {
          const buf = internalRoom.inputBuffers.get(client.sessionId) || [];
          buf.push({
            protocolVersion: 1,
            tick: t,
            timestamp: Date.now(),
            actions: t % 2 === 0 ? ["thrust"] : [],
            axes: { rotate_x: Math.cos(idx) }
          });
          internalRoom.inputBuffers.set(client.sessionId, buf);
        });
        internalRoom.update(16.66);
      }

      const world = internalRoom.world;

      // Capture raw snapshot for analysis at tick 10
      const aosSnapshot = SnapshotSerializer.snapshot(world);

      // Measure Strategy Packets
      const legacyStrategy = new LegacyReplicationStrategy();
      const legacyRes = legacyStrategy.replicate(room, clients, room.state, 10);

      const interestStrategy = new InterestReplicationStrategy();
      const interestRes = interestStrategy.replicate(room, clients, room.state, 10);

      const binaryStrategy = new BinaryReplicationStrategy();
      const binaryRes = binaryStrategy.replicate(room, clients, room.state, 10);

      const deltaStrategy = new DeltaReplicationStrategy();
      const deltaRes = deltaStrategy.replicate(room, clients, room.state, 10);

      // Component Byte Breakdown from AoS snapshot componentData
      const componentData = aosSnapshot.componentData;
      const componentBytes: Record<string, number> = {};
      let totalCompBytes = 0;

      for (const compType in componentData) {
        const serialized = JSON.stringify(componentData[compType]);
        const bytes = Buffer.byteLength(serialized, "utf8");
        componentBytes[compType] = bytes;
        totalCompBytes += bytes;
      }

      const inputBytes = componentBytes["Input"] || 0;
      const inputPercent = totalCompBytes > 0 ? (inputBytes / totalCompBytes) * 100 : 0;

      internalRoom.onDispose();

      return {
        numPlayers,
        tick: 10,
        activeEntities: world.entities.length,
        legacyBytes: legacyRes.totalBytesSentThisTick,
        interestBytes: interestRes.totalBytesSentThisTick,
        binaryBytes: binaryRes.totalBytesSentThisTick,
        deltaBytes: deltaRes.totalBytesSentThisTick,
        componentBytes,
        totalCompBytes,
        inputBytes,
        inputPercent
      };
    }

    it("should measure replication packet sizes and component breakdown for Asteroids (N=2 and N=8)", async () => {
      const res2 = await setupAsteroidsRoomAndMeasure(2);
      const res8 = await setupAsteroidsRoomAndMeasure(8);

      console.log("\n=== 4.4 MEASUREMENT RESULTS - ASTEROIDS (N=2) ===");
      console.log(`Game: Asteroids, Tick: ${res2.tick}, Players: 2, Entities: ${res2.activeEntities}`);
      console.log(`Legacy Strategy Payload: ${res2.legacyBytes} bytes`);
      console.log(`Interest Strategy Payload: ${res2.interestBytes} bytes`);
      console.log(`Binary Strategy Payload: ${res2.binaryBytes} bytes`);
      console.log(`Delta Strategy Payload: ${res2.deltaBytes} bytes`);
      console.log(`Component Breakdown (JSON bytes):`, JSON.stringify(res2.componentBytes, null, 2));
      console.log(`Total Component Bytes: ${res2.totalCompBytes}, Input Bytes: ${res2.inputBytes} (${res2.inputPercent.toFixed(2)}%)`);

      console.log("\n=== 4.4 MEASUREMENT RESULTS - ASTEROIDS (N=8) ===");
      console.log(`Game: Asteroids, Tick: ${res8.tick}, Players: 8, Entities: ${res8.activeEntities}`);
      console.log(`Legacy Strategy Payload: ${res8.legacyBytes} bytes`);
      console.log(`Interest Strategy Payload: ${res8.interestBytes} bytes`);
      console.log(`Binary Strategy Payload: ${res8.binaryBytes} bytes`);
      console.log(`Delta Strategy Payload: ${res8.deltaBytes} bytes`);
      console.log(`Component Breakdown (JSON bytes):`, JSON.stringify(res8.componentBytes, null, 2));
      console.log(`Total Component Bytes: ${res8.totalCompBytes}, Input Bytes: ${res8.inputBytes} (${res8.inputPercent.toFixed(2)}%)`);

      expect(res2.legacyBytes).toBeGreaterThan(0);
      expect(res8.legacyBytes).toBeGreaterThan(0);
    });
  });
});
