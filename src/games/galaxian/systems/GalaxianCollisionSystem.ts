import { System, World, ShapeType, CircleShape } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianEnemyComponent, GalaxianStateComponent } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";
import { BulletPool } from "../EntityPool";

export class GalaxianCollisionSystem extends System<GalaxianComponentRegistry> {
  private bulletPool: BulletPool;

  constructor(bulletPool: BulletPool) {
    super();
    this.bulletPool = bulletPool;
  }

  public update(world: World<GalaxianComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config = world.getResource<GalaxianConfig>("GameConfig");
    const stateEntities = world.query("GameState");
    if (stateEntities.length === 0) return;
    const state = world.getMutableComponent(stateEntities[0], "GameState") as GalaxianStateComponent | undefined;
    if (!state || state.isGameOver) return;

    const playerBullets = world.query("PlayerBullet", "Transform", "Collider");
    const enemyBullets = world.query("EnemyBullet", "Transform", "Collider");
    const enemies = world.query("GalaxianEnemy", "Transform", "Collider");
    const players = world.query("Player", "Transform", "Collider");

    // 1. Player Bullet vs Enemy Collision
    for (const pbEntity of playerBullets) {
      const pbTrans = world.getComponent(pbEntity, "Transform");
      const pbCollider = world.getComponent(pbEntity, "Collider");
      if (!pbTrans || !pbCollider) continue;

      const pbRadius = (pbCollider.shape as CircleShape).radius || 4;

      for (const enemyEntity of enemies) {
        const enemyTrans = world.getComponent(enemyEntity, "Transform");
        const enemyCollider = world.getComponent(enemyEntity, "Collider");
        const enemyComp = world.getComponent(enemyEntity, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
        if (!enemyTrans || !enemyCollider || !enemyComp) continue;

        const enemyRadius = (enemyCollider.shape as CircleShape).radius || 12;
        const dist = Math.hypot(pbTrans.x - enemyTrans.x, pbTrans.y - enemyTrans.y);

        if (dist <= pbRadius + enemyRadius) {
          const inDive = enemyComp.state === "diving" || enemyComp.state === "windup";
          let points = inDive ? enemyComp.pointsDive : enemyComp.pointsFormation;

          if (enemyComp.enemyType === "flagship" && inDive) {
            const accompanyingEscorts = enemies.filter((e) => {
              const comp = world.getComponent(e, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
              return comp && comp.leaderEntity === enemyEntity && (comp.state === "diving" || comp.state === "windup");
            });
            if (accompanyingEscorts.length > 0) {
              points += enemyComp.bonusEscorted;
            }
          }

          state.score += points;
          state.highScore = Math.max(state.highScore, state.score);
          state.enemiesRemaining = Math.max(0, state.enemiesRemaining - 1);

          world.getEventBus()?.emit("combat:enemy_hit", {
            entity: enemyEntity,
            points,
            x: enemyTrans.x,
            y: enemyTrans.y,
            enemyType: enemyComp.enemyType,
            inDive,
          });

          world.commands.removeEntity(enemyEntity);
          this.bulletPool.release(world, pbEntity);
          break;
        }
      }
    }

    // 2. Enemy / EnemyBullet vs Player Collision
    for (const pEntity of players) {
      const pTrans = world.getMutableComponent(pEntity, "Transform");
      const pCollider = world.getComponent(pEntity, "Collider");
      if (!pTrans || !pCollider) continue;

      const pRadius = (pCollider.shape as CircleShape).radius || 12;
      let playerHit = false;

      // Enemy Bullet vs Player
      for (const ebEntity of enemyBullets) {
        const ebTrans = world.getComponent(ebEntity, "Transform");
        if (!ebTrans) continue;

        if (Math.hypot(ebTrans.x - pTrans.x, ebTrans.y - pTrans.y) <= pRadius + 4) {
          playerHit = true;
          this.bulletPool.release(world, ebEntity);
          break;
        }
      }

      // Enemy Body vs Player
      if (!playerHit) {
        for (const enemyEntity of enemies) {
          const enemyTrans = world.getComponent(enemyEntity, "Transform");
          const enemyCollider = world.getComponent(enemyEntity, "Collider");
          if (!enemyTrans || !enemyCollider) continue;

          const eRadius = (enemyCollider.shape as CircleShape).radius || 12;
          if (Math.hypot(enemyTrans.x - pTrans.x, enemyTrans.y - pTrans.y) <= pRadius + eRadius) {
            playerHit = true;
            state.enemiesRemaining = Math.max(0, state.enemiesRemaining - 1);
            world.commands.removeEntity(enemyEntity);
            break;
          }
        }
      }

      if (playerHit) {
        state.lives--;
        world.getEventBus()?.emit("player:hit", { x: pTrans.x, y: pTrans.y });

        if (state.lives <= 0) {
          state.isGameOver = true;
        } else {
          pTrans.x = (config?.worldWidth ?? 480) / 2;
          pTrans.y = (config?.worldHeight ?? 640) - 50;
          pTrans.dirty = true;
        }
      }
    }
  }
}
