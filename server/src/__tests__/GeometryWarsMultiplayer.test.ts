import { GeometryWarsRoom } from "../GeometryWarsRoom";
import { type Client } from "@colyseus/core";

describe("GeometryWarsMultiplayer Stress Test", () => {
  let room: GeometryWarsRoom;

  beforeEach(async () => {
    room = new GeometryWarsRoom();
    room.setState = jest.fn((state) => {
      room.state = state;
    }) as any;
    room.setPatchRate = jest.fn();
    room.setSimulationInterval = jest.fn();
    room.onMessage = jest.fn() as any;
    room.broadcast = jest.fn();

    await room.onCreate({ seed: 98765 });
  });

  afterEach(() => {
    room.onDispose();
  });

  it("should simulate stable snapshots and state synchronization under load of 4 players and 150 concurrent enemies", () => {
    // 1. Join 4 clients
    const clients: Client[] = Array.from({ length: 4 }, (_, i) => ({
      sessionId: `player_session_${i}`,
      send: jest.fn(),
    } as unknown as Client));

    clients.forEach((client, i) => {
      room.onJoin(client, { name: `Player_${i}` });
    });

    expect(room.state.players.size).toBe(4);

    // 2. Start game to trigger spawning and state updates
    room.state.gameStarted = true;

    // 3. Manually inject 150 concurrent enemies into the ECS world to simulate high load
    const world = (room as any).world;
    const gameplayRandom = world.gameplayRandom;
    gameplayRandom.unlock();

    for (let i = 0; i < 150; i++) {
      const enemyEntity = world.createEntity();
      world.addComponent(enemyEntity, {
        type: "Transform",
        x: gameplayRandom.nextRange(0, 800),
        y: gameplayRandom.nextRange(0, 600),
        rotation: gameplayRandom.nextRange(0, Math.PI * 2),
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 100,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(enemyEntity, {
        type: "Faction",
        faction: "enemy",
        value: "enemy"
      });
      world.addComponent(enemyEntity, {
        type: "Render",
        shape: "gw_chaser",
        size: 14,
        color: "#ff00ff",
        visible: true,
        opacity: 1,
        order: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      });
    }
    gameplayRandom.lock();

    // 4. Record initial simulation time and run 10 simulation frames under load
    const startTime = Date.now();
    const numberOfTicks = 10;

    for (let tick = 0; tick < numberOfTicks; tick++) {
      // Simulate client sending movement & shooting inputs
      clients.forEach((client, index) => {
        const buffer = (room as any).inputBuffers.get(client.sessionId) || [];
        buffer.push({
          protocolVersion: 1,
          tick: tick + 1,
          timestamp: Date.now(),
          actions: tick % 2 === 0 ? ["fire"] : [],
          axes: {
            moveX: Math.cos(index),
            moveY: Math.sin(index),
            aimX: Math.sin(index),
            aimY: -Math.cos(index)
          }
        });
        (room as any).inputBuffers.set(client.sessionId, buffer);
      });

      // Update room frame
      room.update(16.66);
    }

    const duration = Date.now() - startTime;
    console.log(`[GeometryWarsMultiplayer Stress Test] Simulated ${numberOfTicks} ticks under load of 4 players and 150+ enemies in ${duration}ms.`);

    // 5. Verify that all 4 players remain connected and synchronized
    expect(room.state.players.size).toBe(4);
    room.state.players.forEach((player) => {
      expect(player.alive).toBe(true);
      expect(player.x).toBeGreaterThanOrEqual(0);
      expect(player.y).toBeGreaterThanOrEqual(0);
    });

    // 6. Verify that 150+ concurrent enemies are fully synced to the Colyseus state
    expect(room.state.enemies.size).toBeGreaterThanOrEqual(150);
  });
});
