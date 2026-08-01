import { Room, type Client, CloseCode } from "@colyseus/core";
import { AsteroidsState, Player, Asteroid, Bullet } from "./schema/GameState";

import { InputFrame, ReplayFrame, GameEvent } from "./NetTypes";
import { World, InterestManagerSystem, ReplicationStateTracker, ClientAckTracker, NetworkDeltaSystem, NetworkBudgetManager, WorldSnapshot, Schedule, SystemPhase, ComponentType, CombinedEvents } from "@tiny-aster/core";
import { AsteroidsGame, createShip, createAsteroid, AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../../src/games/asteroids";
import { z } from "zod";
import { ReplicationStrategy } from "./replication/ReplicationStrategy";
import { LegacyReplicationStrategy } from "./replication/LegacyReplicationStrategy";
import { InterestReplicationStrategy } from "./replication/InterestReplicationStrategy";
import { DeltaReplicationStrategy } from "./replication/DeltaReplicationStrategy";
import { BudgetReplicationStrategy } from "./replication/BudgetReplicationStrategy";
import { BinaryReplicationStrategy } from "./replication/BinaryReplicationStrategy";

const RoomOptionsSchema = z.object({
  seed: z.number().int().optional(),
  replicationMode: z.enum(['legacy', 'interest', 'delta', 'budget', 'binary']).optional()
});

export type AsteroidsRoomOptions = z.infer<typeof RoomOptionsSchema>;

const JoinOptionsSchema = z.object({
  name: z.string().max(32).optional()
});

const InputFrameSchema = z.object({
  protocolVersion: z.number().optional(),
  tick: z.number().int().nonnegative(),
  timestamp: z.number().optional(),
  actions: z.array(z.string()),
  axes: z.record(z.string(), z.number())
});
import { leaderboardStore } from "./DailyLeaderboardStore";
import { logger } from "../../src/utils/logger";
import { getDateKey } from "./utils/DateUtils";
import { NetworkMetricsCollector } from "./metrics/NetworkMetrics";

/**
 * Authoritative game room for the Asteroids simulation.
 *
 * @remarks
 * This room runs a headless version of the {@link AsteroidsGame} and manages
 * authoritative state synchronization, input buffering, and replication budgets.
 *
 * @warning
 * **Replication & Bandwidth**: Large numbers of entities or frequent state
 * updates may exceed the network budget. The room uses different replication
 * modes (interest management, delta compression) intended to help mitigate this;
 * however, consistency remains dependent on the configured patch rate, network
 * conditions, and client ACK stability.
 */
/**
 * Ring buffer size constant for authoritative state history.
 * HISTORY_BUFFER_TICKS = 30 frames is sufficient for holding up to 500ms of history at 60fps.
 * WARNING: Do not decrease this below the maximum expected round-trip time (RTT) + jitter,
 * or client prediction and input reconciliation may fail to find matching tick snapshots.
 */
const HISTORY_BUFFER_TICKS = 30;

export class AsteroidsRoom extends Room<{ state: AsteroidsState }> {
  maxClients = 4;
  private fixedTimeStep = 16.66;
  private inputBuffers = new Map<string, InputFrame[]>();
  private stateHistory = new Map<number, WorldSnapshot>();
  private clientAcks = new Map<string, number>();
  private replayFrames: ReplayFrame[] = [];
  private gameSimulation!: AsteroidsGame;
  public world!: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  public playerEntities = new Map<string, number>();
  public newClients = new Set<string>();
  private nextPlayerNumber = 1;
  public networkMetrics = new NetworkMetricsCollector();
  private replicationTracker = new ReplicationStateTracker();
  public ackTracker = new ClientAckTracker();
  public budgetManager = new NetworkBudgetManager();
  public deltaSystem = new NetworkDeltaSystem(this.replicationTracker);
  private REPLICATION_MODE: 'legacy' | 'interest' | 'delta' | 'budget' | 'binary' = 'binary';
  private replicationStrategy!: ReplicationStrategy<AsteroidsRoom, Client, AsteroidsState>;

  private spawnAsteroids(count: number) {
    const gameplayRandom = this.world.gameplayRandom;
    for (let i = 0; i < count; i++) {
        const x = gameplayRandom.nextRange(0, this.state.gameWidth);
        const y = gameplayRandom.nextRange(0, this.state.gameHeight);
        createAsteroid({ world: this.world, x, y, size: "large" });
    }
  }

  async onCreate(options: unknown) {
    const parsedOptions = RoomOptionsSchema.safeParse(options);
    const validOptions = parsedOptions.success ? parsedOptions.data : {};

    if (validOptions.replicationMode) {
        this.REPLICATION_MODE = validOptions.replicationMode;
    }

    switch (this.REPLICATION_MODE) {
        case 'legacy':
            this.replicationStrategy = new LegacyReplicationStrategy();
            break;
        case 'interest':
            this.replicationStrategy = new InterestReplicationStrategy();
            break;
        case 'delta':
            this.replicationStrategy = new DeltaReplicationStrategy();
            break;
        case 'budget':
            this.replicationStrategy = new BudgetReplicationStrategy();
            break;
        case 'binary':
            this.replicationStrategy = new BinaryReplicationStrategy();
            break;
        default:
            this.replicationStrategy = new BinaryReplicationStrategy();
    }

    this.newClients.clear();
    this.setState(new AsteroidsState());
    this.state.seed = validOptions.seed || Math.floor(Math.random() * 0xFFFFFFFF);

    const serverSchedule = new Schedule<AsteroidsComponentRegistry, AsteroidsEventRegistry>([
      SystemPhase.Input,
      SystemPhase.Simulation,
      SystemPhase.Transform,
      SystemPhase.Collision,
      SystemPhase.GameRules
    ]);

    this.gameSimulation = new AsteroidsGame({
        headless: true,
        isMultiplayer: true,
        gameOptions: { seed: this.state.seed },
        schedule: serverSchedule
    });
    await this.gameSimulation.init();
    this.world = this.gameSimulation.getWorld();
    if (this.REPLICATION_MODE === 'binary') {
        this.world.setResource("UseSoASnapshots", true);
    }

    this.state.gameWidth = 800;
    this.state.gameHeight = 600;
    this.state.gameStarted = false;
    this.state.gameOver = false;
    this.state.serverTick = 0;

    this.setPatchRate(50);
    this.setSimulationInterval((dt: number) => this.update(dt));

    this.onMessage("input", (client: Client, frame: unknown) => {
      const parsedFrame = InputFrameSchema.safeParse(frame);
      if (!parsedFrame.success) {
        logger.warn(`[AsteroidsRoom] Invalid input frame from client ${client.sessionId}:`, parsedFrame.error.issues);
        return;
      }
      const validFrame = parsedFrame.data as unknown as InputFrame;
      const buffer = this.inputBuffers.get(client.sessionId) || [];
      buffer.push(validFrame);
      this.inputBuffers.set(client.sessionId, buffer);
    });

    this.onMessage("sync_tick", (client: Client, data: unknown) => {
      const syncData = data as Record<string, unknown> | null | undefined;
      if (syncData?.lastAckedVersion !== undefined) {
        this.clientAcks.set(client.sessionId, syncData.lastAckedVersion as number);
      }
      if (syncData?.sequence !== undefined) {
        this.ackTracker.recordAck(client.sessionId, syncData.sequence as number, this.state.serverTick);
      }
      client.send("sync_tick", {
        protocolVersion: this.state.protocolVersion,
        serverTick: this.state.serverTick,
        timestamp: (syncData?.timestamp && (syncData.timestamp as number) > 0) ? syncData.timestamp : Date.now()
      });
    });

    this.onMessage("start_game", () => {
      if (this.state.gameStarted) return;
      this.state.gameStarted = true;
      this.spawnAsteroids(6);

      this.world.getEventBus().on("game:over" as keyof CombinedEvents<AsteroidsEventRegistry> & string, () => {
          this.state.gameOver = true;
          logger.log(`[AsteroidsRoom] Game Over. Final Authoritative Score: ${this.state.score}`);
      });
    });

    this.onMessage("metrics", (client: Client) => {
      client.send("metrics", {
        protocolVersion: this.state.protocolVersion,
        ...this.networkMetrics.getMetrics()
      });
    });

    this.world.addSystem(new InterestManagerSystem());
  }

  onJoin(client: Client, options: unknown) {
    const parsedOptions = JoinOptionsSchema.safeParse(options);
    const validOptions = parsedOptions.success ? parsedOptions.data : {};

    const gameplayRandom = this.world.gameplayRandom;
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = validOptions.name || `Player ${this.nextPlayerNumber++}`;
    player.x = gameplayRandom.nextRange(100, 700);
    player.y = gameplayRandom.nextRange(100, 500);
    player.angle = 0;
    player.score = 0;
    player.lives = 3;
    player.alive = true;
    this.state.players.set(client.sessionId, player);

    const entity = createShip({ world: this.world, x: player.x, y: player.y });
    this.playerEntities.set(client.sessionId, entity);
    this.newClients.add(client.sessionId);

    this.world.addComponent(entity, {
        type: "Ship",
        sessionId: client.sessionId,
    } as AsteroidsComponentRegistry["Ship"]);
  }

  async onLeave(client: Client, _code: number) {
    const player = this.state.players.get(client.sessionId);
    if (player && player.score > 0) {
        const dateKey = getDateKey();
        logger.log(`[AsteroidsRoom] Recording authoritative score for ${player.name}: ${player.score}`);
        leaderboardStore.addScore("asteroids", dateKey, player.sessionId, player.score, player.name, true);
    }

    try {
      if (_code === CloseCode.CONSENTED) throw new Error("consented leave");
      await this.allowReconnection(client, 10);
    } catch (_err) {
      this.state.players.delete(client.sessionId);
      this.inputBuffers.delete(client.sessionId);
      this.clientAcks.delete(client.sessionId);
      this.newClients.delete(client.sessionId);
    }
  }

  update(_dt: number) {
    if (!this.state.gameStarted) return;
    this.state.serverTick++;
    this.state.lastProcessedTick = this.state.serverTick;

    const currentInputs: Record<string, InputFrame[]> = {};
    this.state.players.forEach((_player: Player, sessionId: string) => {
      const entity = this.playerEntities.get(sessionId);
      if (entity === undefined) return;

      const buffer = this.inputBuffers.get(sessionId);

      if (buffer) {
        const frame = buffer.find(f => f.tick === this.state.serverTick);
        if (frame) {
            this.gameSimulation.applyInputToEntity(entity, frame);
            currentInputs[sessionId] = [frame];
        }
      }
    });

    this.gameSimulation.runSimulationStep(this.fixedTimeStep, false);

    this.syncWorldToSchema();

    const { totalBytesSentThisTick, totalSerializationMs, totalEntitiesFiltered } =
        this.replicationStrategy.replicate(this, this.clients, this.state, this.state.serverTick);

    const trackedEntitiesCount = this.state.players.size + this.state.asteroids.size + this.state.bullets.size;

    this.networkMetrics.recordTick(
        totalBytesSentThisTick,
        trackedEntitiesCount,
        totalSerializationMs,
        this.clients.length,
        this.clients.length > 0 ? totalEntitiesFiltered / this.clients.length : 0
    );


    this.replayFrames.push({
        tick: this.state.serverTick,
        inputs: currentInputs,
        events: [] as GameEvent[]
    });

    if (this.replayFrames.length > 18000) {
        this.replayFrames.shift();
    }

    this.state.players.forEach((_player: Player, sessionId: string) => {
      const buffer = this.inputBuffers.get(sessionId);
      if (buffer) {
        this.inputBuffers.set(sessionId, buffer.filter(f => f.tick > this.state.serverTick));
      }
    });

    this.stateHistory.set(this.state.serverTick, this.world.snapshot());

    const oldestTick = this.state.serverTick - HISTORY_BUFFER_TICKS;
    this.stateHistory.delete(oldestTick);

    if (this.state.gameOver && this.replayFrames.length > 0) {
        this.broadcast("replay", {
            protocolVersion: this.state.protocolVersion,
            version: 1,
            roomId: this.roomId,
            startTick: this.replayFrames[0].tick,
            endTick: this.state.serverTick,
            frames: this.replayFrames
        });
        this.replayFrames = [];
    }
  }

  onDispose() {
    logger.log(`[AsteroidsRoom] Disposing room ${this.roomId}`);
    this.stateHistory.clear();
    this.inputBuffers.clear();
    this.clientAcks.clear();
    this.playerEntities.clear();
    this.newClients.clear();
    this.replayFrames = [];
    if (this.gameSimulation) {
        this.gameSimulation.destroy();
    }
    if (this.networkMetrics) {
        this.networkMetrics.destroy();
    }
  }

  private syncWorldToSchema() {
    this.playerEntities.forEach((entity, sessionId) => {
        const player = this.state.players.get(sessionId);
        if (!player) return;

        const pos = this.world.getComponent(entity, "Transform");
        const vel = this.world.getComponent(entity, "Velocity");
        const render = this.world.getComponent(entity, "Render");
        const health = this.world.getComponent(entity, "Health");

        if (pos) {
            player.x = pos.x;
            player.y = pos.y;
            player.angle = pos.rotation;
        }
        if (render) {
            if (render.rotation !== undefined) player.angle = render.rotation;
        }
        if (vel) {
            player.velocityX = vel.vx;
            player.velocityY = vel.vy;
        }
        if (health) {
            player.lives = health.current;
            player.alive = health.current > 0;
        }

        const ship = this.world.getComponent(entity, "Ship");
        if (ship) {
            // score logic if available
        }
        const playerScore = this.world.getComponent(entity, "PlayerScore" as unknown as ComponentType<AsteroidsComponentRegistry>) as { score: number } | undefined;
        if (playerScore) {
            player.score = playerScore.score;
        }
    });

    const asteroidEntities = this.world.query("Asteroid", "Transform");
    const currentAsteroidIds = new Set<string>();
    asteroidEntities.forEach(entity => {
        const id = entity.toString();
        currentAsteroidIds.add(id);
        const pos = this.world.getComponent(entity, "Transform")!;
        const asteroidComp = this.world.getComponent(entity, "Asteroid")!;

        let asteroid = this.state.asteroids.get(id);
        if (!asteroid) {
            asteroid = new Asteroid();
            asteroid.id = id;
            this.state.asteroids.set(id, asteroid);
        }
        asteroid.x = pos.x;
        asteroid.y = pos.y;
        asteroid.size = asteroidComp.size === "large" ? 3 : asteroidComp.size === "medium" ? 2 : 1;
    });
    this.state.asteroids.forEach((_: Asteroid, id: string) => {
        if (!currentAsteroidIds.has(id)) this.state.asteroids.delete(id);
    });

    const bulletEntities = this.world.query("Bullet", "Transform");
    const currentBulletIds = new Set<string>();
    bulletEntities.forEach(entity => {
        const id = entity.toString();
        currentBulletIds.add(id);
        const pos = this.world.getComponent(entity, "Transform")!;

        let bullet = this.state.bullets.get(id);
        if (!bullet) {
            bullet = new Bullet();
            this.state.bullets.set(id, bullet);
        }
        bullet.x = pos.x;
        bullet.y = pos.y;

        const bulletComp = this.world.getComponent(entity, "Bullet");
        if (bulletComp?.ownerId) {
            bullet.ownerId = bulletComp.ownerId;
        }
    });
    this.state.bullets.forEach((_: Bullet, id: string) => {
        if (!currentBulletIds.has(id)) this.state.bullets.delete(id);
    });

    const gameState = this.world.getSingleton("GameState");
    if (gameState && this.state.players.size > 0) {
        this.state.score = gameState.score;

        let anyAlive = false;
        this.state.players.forEach((p: Player) => { if (p.alive) anyAlive = true; });
        if (!anyAlive && this.state.gameStarted) this.state.gameOver = true;
    }
  }
}
