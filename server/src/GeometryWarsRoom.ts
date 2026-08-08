import { Room as ColyseusRoom, type Client, CloseCode } from "@colyseus/core";
import { GeometryWarsState, GeometryWarsPlayer, GeometryWarsEnemy, GeometryWarsBullet } from "./schema/GeometryWarsState";
import { z } from "zod";
import { InputFrame } from "./NetTypes";
import { World } from "@tiny-aster/core";
import { GeometryWarsGame } from "../../src/games/geometrywars/GeometryWarsGame";

const Room = ColyseusRoom as any as { new <T extends object = any>(): ColyseusRoom<{ state: T }> };

const RoomOptionsSchema = z.object({
  seed: z.number().int().optional()
});

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

export class GeometryWarsRoom extends Room<GeometryWarsState> {
  maxClients = 4;
  private inputBuffers = new Map<string, InputFrame[]>();
  private clientAcks = new Map<string, number>();
  private newClients = new Set<string>();
  private playerEntities = new Map<string, number>();
  private gameSimulation!: GeometryWarsGame;
  private world!: World<any, any, any>;
  private fixedTimeStep = 0.01666;

  async onCreate(options: any) {
    const parsedOptions = RoomOptionsSchema.safeParse(options);
    const validOptions = parsedOptions.success ? parsedOptions.data : {};

    this.setState(new GeometryWarsState());
    this.state.seed = validOptions.seed || Math.floor(Math.random() * 0xFFFFFFFF);
    this.state.gameWidth = 800;
    this.state.gameHeight = 600;
    this.state.gameStarted = false;
    this.state.gameOver = false;
    this.state.serverTick = 0;
    this.state.score = 0;
    this.state.wave = 1;
    this.state.bombs = 3;

    this.gameSimulation = new GeometryWarsGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: this.state.seed }
    });
    await this.gameSimulation.init();
    this.world = this.gameSimulation.getWorld();

    this.setPatchRate(50);
    this.setSimulationInterval((dt: number) => this.update(dt));

    this.onMessage("input", (client: Client, message: any) => {
      const parsedFrame = InputFrameSchema.safeParse(message);
      if (!parsedFrame.success) {
        console.warn(`[GeometryWarsRoom] Malformed input frame from ${client.sessionId}`);
        return;
      }

      const frame = parsedFrame.data as unknown as InputFrame;

      // Protection against malformed/overflow bounds
      if (frame.tick < 0 || frame.tick > this.state.serverTick + 1000) {
        return;
      }

      // Action/axes sanitization checks
      const allowedActions = ["fire", "bomb"];
      const filteredActions = frame.actions.filter(a => allowedActions.includes(a));

      const sanitizedAxes: Record<string, number> = {};
      ["moveX", "moveY"].forEach(axis => {
        if (frame.axes[axis] !== undefined) {
          const val = Number(frame.axes[axis]);
          if (!isNaN(val)) {
            sanitizedAxes[axis] = Math.max(-1, Math.min(1, val));
          }
        }
      });
      ["aimX", "aimY"].forEach(axis => {
        if (frame.axes[axis] !== undefined) {
          const val = Number(frame.axes[axis]);
          if (!isNaN(val)) {
            sanitizedAxes[axis] = val;
          }
        }
      });

      const sanitizedFrame: InputFrame = {
        protocolVersion: frame.protocolVersion || 1,
        tick: frame.tick,
        timestamp: frame.timestamp || Date.now(),
        actions: filteredActions,
        axes: sanitizedAxes
      };

      const buffer = this.inputBuffers.get(client.sessionId) || [];
      // Prevent duplicate ticks or extreme spam
      if (buffer.some(f => f.tick === sanitizedFrame.tick)) {
        return;
      }

      buffer.push(sanitizedFrame);
      // Cap buffer size
      if (buffer.length > 120) {
        buffer.shift();
      }
      this.inputBuffers.set(client.sessionId, buffer);
    });

    this.onMessage("sync_tick", (client: Client, data: any) => {
      if (data?.lastAckedVersion !== undefined) {
        this.clientAcks.set(client.sessionId, data.lastAckedVersion);
      }
      client.send("sync_tick", {
        protocolVersion: this.state.protocolVersion,
        serverTick: this.state.serverTick,
        timestamp: (data?.timestamp && data.timestamp > 0) ? data.timestamp : Date.now()
      });
    });

    this.onMessage("start_game", () => {
      if (this.state.gameStarted) return;
      this.state.gameStarted = true;
    });
  }

  onJoin(client: Client, options: any) {
    const parsedOptions = JoinOptionsSchema.safeParse(options);
    const validOptions = parsedOptions.success ? parsedOptions.data : {};

    // Remove any default singleplayer player entity to avoid leftovers
    const defaultPlayers = this.world.query("Player");
    for (const p of defaultPlayers) {
      this.world.getCommandBuffer().removeEntity(p);
    }
    this.world.flush();

    const player = new GeometryWarsPlayer();
    player.sessionId = client.sessionId;
    player.name = validOptions.name || `Player ${client.sessionId}`;
    player.x = 400;
    player.y = 300;
    player.angle = 0;
    player.velocityX = 0;
    player.velocityY = 0;
    player.lives = 3;
    player.alive = true;
    player.score = 0;

    this.state.players.set(client.sessionId, player);
    this.newClients.add(client.sessionId);
    this.inputBuffers.set(client.sessionId, []);

    // Spawn player entity in the ECS world and map it
    const entity = this.world.createEntity();
    this.playerEntities.set(client.sessionId, entity);

    const blueprints = this.world.getResource<any>("BlueprintRegistry");
    const playerBlueprint = blueprints?.get("player");
    if (playerBlueprint) {
      playerBlueprint.spawn(this.world, entity, { x: player.x, y: player.y });
    } else {
      console.error("[GeometryWarsRoom] Player blueprint not found!");
    }
  }

  async onLeave(client: Client, code: number) {
    try {
      if (code === CloseCode.CONSENTED) {
        throw new Error("consented leave");
      }
      await this.allowReconnection(client, 10);
    } catch {
      const entity = this.playerEntities.get(client.sessionId);
      if (entity !== undefined) {
        this.world.getCommandBuffer().removeEntity(entity);
        this.playerEntities.delete(client.sessionId);
      }
      this.state.players.delete(client.sessionId);
      this.inputBuffers.delete(client.sessionId);
      this.clientAcks.delete(client.sessionId);
      this.newClients.delete(client.sessionId);
    }
  }

  update(_dt: number) {
    if (!this.state.gameStarted) return;
    this.state.serverTick++;

    // Apply client inputs to players
    this.state.players.forEach((player, sessionId) => {
      const entity = this.playerEntities.get(sessionId);
      if (entity === undefined) return;

      const buffer = this.inputBuffers.get(sessionId);
      if (buffer) {
        const frame = buffer.find(f => f.tick === this.state.serverTick);
        if (frame) {
          this.gameSimulation.applyInputToEntity(entity, frame);
        }
      }
    });

    // Step simulation
    this.gameSimulation.runSimulationStep(this.fixedTimeStep, false);

    // Sync state to schema
    this.syncWorldToSchema();

    // Clean up processed inputs
    this.state.players.forEach((player, sessionId) => {
      const buffer = this.inputBuffers.get(sessionId);
      if (buffer) {
        this.inputBuffers.set(sessionId, buffer.filter(f => f.tick > this.state.serverTick));
      }
    });
  }

  private syncWorldToSchema() {
    // 1. Sync Players
    this.playerEntities.forEach((entity, sessionId) => {
      const player = this.state.players.get(sessionId);
      if (!player) return;

      const pos = this.world.getMutableComponent(entity, "Transform");
      const vel = this.world.getMutableComponent(entity, "Velocity");
      const health = this.world.getMutableComponent(entity, "Health");

      if (pos) {
        player.x = pos.x;
        player.y = pos.y;
        player.angle = pos.rotation;
      }
      if (vel) {
        player.velocityX = vel.vx;
        player.velocityY = vel.vy;
      }
      if (health) {
        player.lives = health.current;
        player.alive = health.current > 0;
      }
    });

    // 2. Sync Enemies
    const enemyEntities = this.world.query("Faction", "Transform");
    const currentEnemyIds = new Set<string>();
    enemyEntities.forEach(entity => {
      const factionComp = this.world.getMutableComponent(entity, "Faction");
      if (factionComp && factionComp.faction === "enemy") {
        const id = entity.toString();
        currentEnemyIds.add(id);
        const pos = this.world.getMutableComponent(entity, "Transform")!;
        const render = this.world.getMutableComponent(entity, "Render");

        let enemy = this.state.enemies.get(id);
        if (!enemy) {
          enemy = new GeometryWarsEnemy();
          enemy.id = id;
          enemy.type = render?.shape || "gw_seeker";
          this.state.enemies.set(id, enemy);
        }
        enemy.x = pos.x;
        enemy.y = pos.y;
        enemy.angle = pos.rotation;
      }
    });

    this.state.enemies.forEach((_, id) => {
      if (!currentEnemyIds.has(id)) {
        this.state.enemies.delete(id);
      }
    });

    // 3. Sync Bullets
    const currentBulletIds = new Set<string>();
    const renderEntities = this.world.query("Transform", "Render");
    renderEntities.forEach(entity => {
      const render = this.world.getMutableComponent(entity, "Render")!;
      if (render.shape === "gw_bullet") {
        const id = entity.toString();
        currentBulletIds.add(id);
        const pos = this.world.getMutableComponent(entity, "Transform")!;

        let bullet = this.state.bullets.get(id);
        if (!bullet) {
          bullet = new GeometryWarsBullet();
          bullet.id = id;
          this.state.bullets.set(id, bullet);
        }
        bullet.x = pos.x;
        bullet.y = pos.y;
        bullet.angle = pos.rotation;
      }
    });

    this.state.bullets.forEach((_, id) => {
      if (!currentBulletIds.has(id)) {
        this.state.bullets.delete(id);
      }
    });

    // 4. Sync Global Game State (Score, GameOver, Wave, Bombs)
    const gameState = this.world.getSingleton("GeometryWarsState");
    if (gameState) {
      this.state.score = gameState.score;
      this.state.gameOver = gameState.isGameOver;
      this.state.wave = gameState.wave;
      this.state.bombs = gameState.bombs;
    }
  }

  onDispose() {
    this.playerEntities.clear();
    this.inputBuffers.clear();
    this.clientAcks.clear();
    this.newClients.clear();
    if (this.gameSimulation) {
      this.gameSimulation.destroy();
    }
  }
}
