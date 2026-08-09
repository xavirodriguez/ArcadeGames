import { Room as ColyseusRoom, type Client, CloseCode } from "@colyseus/core";
import { SpaceInvadersState, SpaceInvadersPlayer, SpaceInvaderEntity, SpaceInvadersBulletEntity } from "./schema/SpaceInvadersState";
import { z } from "zod";
import { InputFrame } from "./NetTypes";
import { World } from "@tiny-aster/core";
import { SpaceInvadersGame } from "../../src/games/space-invaders/SpaceInvadersGame";

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

export class SpaceInvadersRoom extends Room<SpaceInvadersState> {
  maxClients = 4;
  private inputBuffers = new Map<string, InputFrame[]>();
  private clientAcks = new Map<string, number>();
  private newClients = new Set<string>();
  private playerEntities = new Map<string, number>();
  private gameSimulation!: SpaceInvadersGame;
  private world!: World<any, any, any>;
  private fixedTimeStep = 16.66;

  async onCreate(options: any) {
    const parsedOptions = RoomOptionsSchema.safeParse(options);
    const validOptions = parsedOptions.success ? parsedOptions.data : {};

    this.setState(new SpaceInvadersState());
    this.state.seed = validOptions.seed || Math.floor(Math.random() * 0xFFFFFFFF);
    this.state.gameWidth = 800;
    this.state.gameHeight = 600;
    this.state.gameStarted = false;
    this.state.gameOver = false;
    this.state.serverTick = 0;

    this.gameSimulation = new SpaceInvadersGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: this.state.seed }
    });
    await this.gameSimulation.init();
    this.world = this.gameSimulation.getWorld();
    this.world.setResource("UseNetworkInputs", true);

    // Also set UseNetworkInputs on the base simulation world to prevent any race condition
    if ((this.gameSimulation as any).world) {
      (this.gameSimulation as any).world.setResource("UseNetworkInputs", true);
    }

    this.setPatchRate(50);
    this.setSimulationInterval((dt: number) => this.update(dt));

    this.onMessage("input", (client: Client, message: any) => {
      const parsedFrame = InputFrameSchema.safeParse(message);
      if (!parsedFrame.success) {
        console.warn(`[SpaceInvadersRoom] Malformed input frame from ${client.sessionId}`);
        return;
      }

      const frame = parsedFrame.data as unknown as InputFrame;

      // Protection against malformed/overflow bounds
      if (frame.tick < 0 || frame.tick > this.state.serverTick + 1000) {
        return;
      }

      // Action/axes sanitization checks
      const allowedActions = ["shoot"];
      const filteredActions = frame.actions.filter(a => allowedActions.includes(a));

      const sanitizedAxes: Record<string, number> = {};
      if (frame.axes.moveX !== undefined) {
        const val = Number(frame.axes.moveX);
        if (!isNaN(val)) {
          sanitizedAxes.moveX = Math.max(-1, Math.min(1, val));
        }
      }

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

      // Spawn initial server-side authoritative state, formation, and shields
      const stateBlueprint = this.gameSimulation.blueprints.get("state");
      if (stateBlueprint) {
        stateBlueprint.spawn(this.world, this.world.createEntity(), {});
      }
      const formationBlueprint = this.gameSimulation.blueprints.get("formation");
      if (formationBlueprint) {
        formationBlueprint.spawn(this.world, this.world.createEntity(), {});
      }
      // Procedurally spawn shields using shield blueprint
      const config = this.world.getResource<any>("GameConfig") || {
        SHIELD_COUNT: 4,
        SHIELD_SEGMENTS_X: 5,
        SHIELD_SEGMENTS_Y: 3,
        SHIELD_START_X: 100,
        SHIELD_START_Y: 400,
        SHIELD_SPACING: 180,
        SHIELD_SEGMENT_SIZE: 15
      };

      const count = config.SHIELD_COUNT;
      const segmentsX = config.SHIELD_SEGMENTS_X;
      const segmentsY = config.SHIELD_SEGMENTS_Y;
      const startY = config.SHIELD_START_Y;
      const spacing = config.SHIELD_SPACING;
      const shieldSize = config.SHIELD_SEGMENT_SIZE || 15;
      const shieldBlueprint = this.gameSimulation.blueprints.get("shield");

      if (shieldBlueprint) {
        for (let i = 0; i < count; i++) {
          const bunkerX = config.SHIELD_START_X + i * spacing;
          for (let row = 0; row < segmentsY; row++) {
            for (let col = 0; col < segmentsX; col++) {
              const ent = this.world.createEntity();
              shieldBlueprint.spawn(this.world, ent, {
                x: bunkerX + col * shieldSize,
                y: startY + row * shieldSize,
                row,
                col
              });
            }
          }
        }
      }
    });
  }

  onJoin(client: Client, options: any) {
    const parsedOptions = JoinOptionsSchema.safeParse(options);
    const validOptions = parsedOptions.success ? parsedOptions.data : {};

    this.world = this.gameSimulation.getWorld();
    this.world.setResource("UseNetworkInputs", true);

    const player = new SpaceInvadersPlayer();
    player.sessionId = client.sessionId;
    player.name = validOptions.name || `Player ${client.sessionId}`;
    player.x = 400;
    player.y = 500;
    player.alive = true;
    player.score = 0;

    this.state.players.set(client.sessionId, player);
    this.newClients.add(client.sessionId);
    this.inputBuffers.set(client.sessionId, []);

    // Spawn player entity in the ECS world and map it
    const entity = this.world.createEntity();
    this.playerEntities.set(client.sessionId, entity);

    const playerBlueprint = this.gameSimulation.blueprints.get("player");
    if (playerBlueprint) {
      playerBlueprint.spawn(this.world, entity, { x: player.x, y: player.y });
    }
  }

  async onLeave(client: Client, code: number) {
    this.world = this.gameSimulation.getWorld();
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
    this.world = this.gameSimulation.getWorld();
    this.world.setResource("UseNetworkInputs", true);

    this.state.serverTick++;
    this.state.lastProcessedTick = this.state.serverTick;

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
    this.world = this.gameSimulation.getWorld();
    // 1. Sync Players
    this.playerEntities.forEach((entity, sessionId) => {
      const player = this.state.players.get(sessionId);
      if (!player) return;

      const pos = this.world.getComponent(entity, "Transform");
      const health = this.world.getComponent(entity, "Health");

      if (pos) {
        player.x = pos.x;
        player.y = pos.y;
      }
      if (health) {
        player.alive = health.current > 0;
      }
    });

    // 2. Sync Invaders
    const invaderEntities = this.world.query("Invader", "Transform");
    const currentInvaderIds = new Set<string>();
    invaderEntities.forEach(entity => {
      const id = entity.toString();
      currentInvaderIds.add(id);
      const pos = this.world.getComponent(entity, "Transform")!;

      let invader = this.state.invaders.get(id);
      if (!invader) {
        invader = new SpaceInvaderEntity();
        invader.id = id;
        this.state.invaders.set(id, invader);
      }
      invader.x = pos.x;
      invader.y = pos.y;
      invader.alive = true; // Active invaders are alive
    });

    this.state.invaders.forEach((_, id) => {
      if (!currentInvaderIds.has(id)) {
        this.state.invaders.delete(id);
      }
    });

    // 3. Sync Bullets (Both player and enemy bullets)
    const playerBulletEntities = this.world.query("PlayerBullet", "Transform");
    const enemyBulletEntities = this.world.query("EnemyBullet", "Transform");
    const currentBulletIds = new Set<string>();

    const syncBullet = (entity: number, ownerId: string) => {
      const id = entity.toString();
      currentBulletIds.add(id);
      const pos = this.world.getComponent(entity, "Transform")!;

      let bullet = this.state.bullets.get(id);
      if (!bullet) {
        bullet = new SpaceInvadersBulletEntity();
        bullet.id = id;
        this.state.bullets.set(id, bullet);
      }
      bullet.x = pos.x;
      bullet.y = pos.y;
      bullet.ownerId = ownerId;
    };

    playerBulletEntities.forEach(entity => syncBullet(entity, "player"));
    enemyBulletEntities.forEach(entity => syncBullet(entity, "enemy"));

    this.state.bullets.forEach((_, id) => {
      if (!currentBulletIds.has(id)) {
        this.state.bullets.delete(id);
      }
    });

    // 4. Sync Global Game State (Score, GameOver, Started)
    const gameState = this.world.getSingleton("GameState");
    if (gameState) {
      this.state.score = gameState.score;
      this.state.gameOver = gameState.isGameOver;
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
