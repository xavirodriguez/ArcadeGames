import { type Client } from "@colyseus/core";
import { SpaceInvadersState, SpaceInvadersPlayer, SpaceInvaderEntity, SpaceInvadersBulletEntity } from "./schema/SpaceInvadersState";
import { z } from "zod";
import { SpaceInvadersGame } from "../../src/games/space-invaders/SpaceInvadersGame";
import { BaseRoom } from "./BaseRoom";

const RoomOptionsSchema = z.object({
  seed: z.number().int().optional()
});

export class SpaceInvadersRoom extends BaseRoom<SpaceInvadersState> {
  maxClients = 4;

  protected async setupSimulation(options: any): Promise<{ world: any; gameSimulation: any }> {
    const parsedOptions = RoomOptionsSchema.safeParse(options);
    const validOptions = parsedOptions.success ? parsedOptions.data : {};

    this.setState(new SpaceInvadersState());
    this.state.seed = validOptions.seed || Math.floor(Math.random() * 0xFFFFFFFF);
    this.state.gameWidth = 800;
    this.state.gameHeight = 600;
    this.state.gameStarted = false;
    this.state.gameOver = false;
    this.state.serverTick = 0;

    const gameSimulation = new SpaceInvadersGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: this.state.seed }
    });
    await gameSimulation.init();
    const world = gameSimulation.getWorld();
    world.setResource("UseNetworkInputs", true);

    if ((gameSimulation as any).world) {
      (gameSimulation as any).world.setResource("UseNetworkInputs", true);
    }

    return { world, gameSimulation };
  }

  async onCreate(options: any): Promise<void> {
    await super.onCreate(options);
    this.allowedActions = ["shoot"];

    this.onMessage("start_game", () => {
      if (this.state.gameStarted) return;
      this.state.gameStarted = true;

      const stateBlueprint = this.gameSimulation.blueprints.get("state");
      if (stateBlueprint) {
        stateBlueprint.spawn(this.world, this.world.createEntity(), {});
      }
      const formationBlueprint = this.gameSimulation.blueprints.get("formation");
      if (formationBlueprint) {
        formationBlueprint.spawn(this.world, this.world.createEntity(), {});
      }

      const config = this.world.getResource("GameConfig") || {
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

  protected spawnPlayer(client: Client, validOptions: any): number {
    this.world.setResource("UseNetworkInputs", true);

    const player = new SpaceInvadersPlayer();
    player.sessionId = client.sessionId;
    player.name = validOptions.name || `Player ${client.sessionId}`;
    player.x = 400;
    player.y = 500;
    player.alive = true;
    player.score = 0;

    this.state.players.set(client.sessionId, player);

    const entity = this.world.createEntity();

    const playerBlueprint = this.gameSimulation.blueprints.get("player");
    if (playerBlueprint) {
      playerBlueprint.spawn(this.world, entity, { x: player.x, y: player.y });
    }

    return entity;
  }

  protected despawnPlayer(_client: Client, entity?: number): void {
    if (entity !== undefined) {
      this.world.getCommandBuffer().removeEntity(entity);
    }
  }

  protected override tick(dt: number): void {
    if (!this.state.gameStarted) return;
    this.world.setResource("UseNetworkInputs", true);
    super.tick(dt);
  }

  protected syncWorldToSchema(): void {
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

    const invaderEntities = this.world.query("Invader", "Transform");
    const currentInvaderIds = new Set<string>();
    invaderEntities.forEach((entity: number) => {
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
      invader.alive = true;
    });

    this.state.invaders.forEach((_, id) => {
      if (!currentInvaderIds.has(id)) {
        this.state.invaders.delete(id);
      }
    });

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

    playerBulletEntities.forEach((entity: number) => syncBullet(entity, "player"));
    enemyBulletEntities.forEach((entity: number) => syncBullet(entity, "enemy"));

    this.state.bullets.forEach((_, id) => {
      if (!currentBulletIds.has(id)) {
        this.state.bullets.delete(id);
      }
    });

    const gameState = this.world.getSingleton("GameState");
    if (gameState) {
      this.state.score = gameState.score;
      this.state.gameOver = gameState.isGameOver;
    }
  }
}
