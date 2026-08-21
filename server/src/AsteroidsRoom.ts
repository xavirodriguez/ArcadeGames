import { type Client } from "@colyseus/core";
import { AsteroidsState, Player, Asteroid, Bullet } from "./schema/GameState";
import { ReplayFrame } from "./NetTypes";
import { World, InterestManagerSystem, ReplicationStateTracker, NetworkDeltaSystem, NetworkBudgetManager, WorldSnapshot, Schedule, SystemPhase } from "@tiny-aster/core";
import { AsteroidsGame, createShip, createAsteroid, AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../../src/games/asteroids";
import { z } from "zod";
import { BaseRoom } from "./BaseRoom";
import { LegacyReplicationStrategy } from "./replication/LegacyReplicationStrategy";
import { InterestReplicationStrategy } from "./replication/InterestReplicationStrategy";
import { DeltaReplicationStrategy } from "./replication/DeltaReplicationStrategy";
import { BudgetReplicationStrategy } from "./replication/BudgetReplicationStrategy";
import { BinaryReplicationStrategy } from "./replication/BinaryReplicationStrategy";
import { leaderboardStore } from "./DailyLeaderboardStore";
import { getDateKey } from "./utils/DateUtils";
import { NetworkMetricsCollector } from "./metrics/NetworkMetrics";

const RoomOptionsSchema = z.object({
  seed: z.number().int().optional(),
  replicationMode: z.enum(['legacy', 'interest', 'delta', 'budget', 'binary']).optional()
});

export type AsteroidsRoomOptions = z.infer<typeof RoomOptionsSchema>;

const HISTORY_BUFFER_TICKS = 30;

export class AsteroidsRoom extends BaseRoom<AsteroidsState> {
  maxClients = 4;
  private stateHistory = new Map<number, WorldSnapshot>();
  private replayFrames: ReplayFrame[] = [];
  private nextPlayerNumber = 1;
  private networkMetrics = new NetworkMetricsCollector();
  private replicationTracker = new ReplicationStateTracker();
  private budgetManager = new NetworkBudgetManager();
  private deltaSystem = new NetworkDeltaSystem(this.replicationTracker);
  private REPLICATION_MODE: 'legacy' | 'interest' | 'delta' | 'budget' | 'binary' = 'binary';

  public update(dt: number) {
    this.tick(dt);
  }

  private spawnAsteroids(count: number) {
    const gameplayRandom = this.world.gameplayRandom;
    const wasLocked = gameplayRandom.isLocked();
    if (wasLocked) gameplayRandom.unlock();
    try {
      for (let i = 0; i < count; i++) {
        const x = gameplayRandom.nextRange(0, this.state.gameWidth);
        const y = gameplayRandom.nextRange(0, this.state.gameHeight);
        createAsteroid({ world: this.world, x, y, size: "large" });
      }
    } finally {
      if (wasLocked) gameplayRandom.lock();
    }
  }

  protected async setupSimulation(options: unknown): Promise<{ world: any; gameSimulation: any }> {
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

    this.setState(new AsteroidsState());
    this.state.seed = validOptions.seed || Math.floor(Math.random() * 0xFFFFFFFF);

    const serverSchedule = new Schedule<AsteroidsComponentRegistry, AsteroidsEventRegistry>([
      SystemPhase.Input,
      SystemPhase.Simulation,
      SystemPhase.Transform,
      SystemPhase.Collision,
      SystemPhase.GameRules
    ]);

    const gameSimulation = new AsteroidsGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: this.state.seed },
      schedule: serverSchedule
    });
    await gameSimulation.init();
    const world = gameSimulation.getWorld();
    if (this.REPLICATION_MODE === 'binary') {
      world.setResource("UseSoASnapshots", true);
    }

    this.state.gameWidth = 800;
    this.state.gameHeight = 600;
    this.state.gameStarted = false;
    this.state.gameOver = false;
    this.state.serverTick = 0;

    return { world, gameSimulation };
  }

  async onCreate(options: unknown): Promise<void> {
    await super.onCreate(options);
    this.allowedActions = ["thrust", "rotateLeft", "rotateRight", "shoot", "hyperspace"];

    this.onMessage("start_game", () => {
      if (this.state.gameStarted) return;
      this.state.gameStarted = true;
      this.spawnAsteroids(6);

      this.world.getEventBus().on("game:over" as any, () => {
        this.state.gameOver = true;
        console.log(`[AsteroidsRoom] Game Over. Final Authoritative Score: ${this.state.score}`);
      });
    });

    this.onMessage("metrics", (client: any) => {
      client.send("metrics", {
        protocolVersion: this.state.protocolVersion,
        ...this.networkMetrics.getMetrics()
      });
    });

    this.world.addSystem(new InterestManagerSystem());
  }

  protected spawnPlayer(client: Client, options: unknown): number {
    const gameplayRandom = this.world.gameplayRandom;
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = (options as any)?.name || `Player ${this.nextPlayerNumber++}`;

    const wasLocked = gameplayRandom.isLocked();
    if (wasLocked) gameplayRandom.unlock();
    try {
      player.x = gameplayRandom.nextRange(100, 700);
      player.y = gameplayRandom.nextRange(100, 500);
    } finally {
      if (wasLocked) gameplayRandom.lock();
    }

    player.angle = 0;
    player.score = 0;
    player.lives = 3;
    player.alive = true;
    this.state.players.set(client.sessionId, player);

    const entity = createShip({ world: this.world, x: player.x, y: player.y });

    this.world.addComponent(entity, {
      type: "Ship",
      sessionId: client.sessionId,
    } as AsteroidsComponentRegistry["Ship"]);

    return entity;
  }

  protected despawnPlayer(client: Client, entity?: number): void {
    const player = this.state.players.get(client.sessionId);
    if (player && player.score > 0) {
      const dateKey = getDateKey();
      console.log(`[AsteroidsRoom] Recording authoritative score for ${player.name}: ${player.score}`);
      leaderboardStore.addScore("asteroids", dateKey, player.sessionId, player.score, player.name, true);
    }

    if (entity !== undefined) {
      this.world.getCommandBuffer().removeEntity(entity);
    }
  }

  protected override collectInputsForTick(): void {
    const currentInputs: Record<string, any> = {};
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

    this.replayFrames.push({
      tick: this.state.serverTick,
      inputs: currentInputs,
      events: []
    });

    if (this.replayFrames.length > 18000) {
      this.replayFrames.shift();
    }
  }

  protected override replicate(): void {
    if (this.replicationStrategy) {
      const { totalBytesSentThisTick, totalSerializationMs, totalEntitiesFiltered } =
        this.replicationStrategy.replicate(this, (this as any).clients, this.state, this.state.serverTick);

      const trackedEntitiesCount = this.state.players.size + this.state.asteroids.size + this.state.bullets.size;

      this.networkMetrics.recordTick(
        totalBytesSentThisTick,
        trackedEntitiesCount,
        totalSerializationMs,
        (this as any).clients.length,
        (this as any).clients.length > 0 ? totalEntitiesFiltered / (this as any).clients.length : 0
      );
    }
  }

  protected override tick(dt: number): void {
    if (!this.state.gameStarted) return;
    super.tick(dt);

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

  override onDispose(): void {
    console.log(`[AsteroidsRoom] Disposing room ${this.roomId}`);
    this.stateHistory.clear();
    this.replayFrames = [];
    if (this.networkMetrics) {
      this.networkMetrics.destroy();
    }
    super.onDispose();
  }

  protected syncWorldToSchema(): void {
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

      const playerScore = this.world.getComponent(entity, "PlayerScore" as any) as { score: number } | undefined;
      if (playerScore) {
        player.score = playerScore.score;
      }
    });

    const asteroidEntities = this.world.query("Asteroid", "Transform");
    const currentAsteroidIds = new Set<string>();
    asteroidEntities.forEach((entity: number) => {
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
    bulletEntities.forEach((entity: number) => {
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
