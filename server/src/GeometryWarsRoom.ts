import { type Client } from "@colyseus/core";
import { GeometryWarsState, GeometryWarsPlayer, GeometryWarsEnemy, GeometryWarsBullet } from "./schema/GeometryWarsState";
import { z } from "zod";
import { GeometryWarsGame } from "../../src/games/geometrywars/GeometryWarsGame";
import { BaseRoom } from "./BaseRoom";

const RoomOptionsSchema = z.object({
  seed: z.number().int().optional()
});

export class GeometryWarsRoom extends BaseRoom<GeometryWarsState> {
  maxClients = 4;

  public update(dt: number) {
    this.tick(dt);
  }

  protected async setupSimulation(options: any): Promise<{ world: any; gameSimulation: any }> {
    const parsedOptions = RoomOptionsSchema.safeParse(options);
    const validOptions = parsedOptions.success ? parsedOptions.data : {};

    this.fixedTimeStep = 0.01666;
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

    const gameSimulation = new GeometryWarsGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: this.state.seed }
    });
    await gameSimulation.init();
    const world = gameSimulation.getWorld();

    return { world, gameSimulation };
  }

  async onCreate(options: any): Promise<void> {
    await super.onCreate(options);
    this.allowedActions = ["fire", "bomb"];

    this.onMessage("start_game", () => {
      if (this.state.gameStarted) return;
      this.state.gameStarted = true;
    });
  }

  protected spawnPlayer(client: Client, validOptions: any): number {
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

    const entity = this.world.createEntity();

    const blueprints = this.world.getResource("BlueprintRegistry");
    const playerBlueprint = blueprints?.get("player");
    if (playerBlueprint) {
      playerBlueprint.spawn(this.world, entity, { x: player.x, y: player.y });
    } else {
      console.error("[GeometryWarsRoom] Player blueprint not found!");
    }

    return entity;
  }

  protected despawnPlayer(_client: Client, entity?: number): void {
    if (entity !== undefined) {
      this.world.getCommandBuffer().removeEntity(entity);
    }
  }

  protected syncWorldToSchema(): void {
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
    enemyEntities.forEach((entity: number) => {
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
    renderEntities.forEach((entity: number) => {
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
}
