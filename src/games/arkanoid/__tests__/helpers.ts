import { Entity, System } from "@tiny-aster/core";
import { ArkanoidGame } from "../ArkanoidGame";
import { ArkanoidGameStateSystem } from "../systems/ArkanoidGameStateSystem";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry } from "../types/ArkanoidTypes";

/**
 * Positions the given ball entity adjacent to/colliding with the given brick entity
 * and applies upward velocity towards the brick.
 */
export function setupBallCollision(gameInstance: ArkanoidGame, ballEntity: Entity, brickEntity: Entity): void {
  const brickPos = gameInstance.world.getComponent(brickEntity, "Transform")!;
  gameInstance.world.mutateComponent(ballEntity, "Ball", (b) => {
    b.isAttached = false;
  });
  gameInstance.world.mutateComponent(ballEntity, "Transform", (t) => {
    t.x = brickPos.x;
    t.y = brickPos.y;
    t.dirty = true;
  });
  gameInstance.world.mutateComponent(ballEntity, "Velocity", (v) => {
    v.vx = 0;
    v.vy = -100;
  });
}

/**
 * Finds and returns a system instance from the game's world schedule.
 */
export function getSystem<T extends System<ArkanoidComponentRegistry, ArkanoidEventRegistry>>(
  gameInstance: ArkanoidGame,
  systemClass: new (...args: any[]) => T
): T | undefined {
  return gameInstance.world.schedule.getSystems().find((s): s is T => s instanceof systemClass);
}

/**
 * Spawns the Doh boss on level 33 and updates the game to flush command buffer.
 */
export function spawnBoss(gameInstance: ArkanoidGame): Entity {
  const stateSystem = getSystem(gameInstance, ArkanoidGameStateSystem);
  if (!stateSystem) {
    throw new Error("ArkanoidGameStateSystem not found");
  }
  stateSystem.spawnLevelBricks(gameInstance.world, 33);
  gameInstance.update(0.016);

  const bossEntities = gameInstance.world.query("Boss");
  if (bossEntities.length === 0) {
    throw new Error("Boss entity was not spawned");
  }
  return bossEntities[0];
}

/**
 * Helper to ensure paddle and ball entities are available.
 */
export function spawnPaddleAndBall(gameInstance: ArkanoidGame): { paddleEntity: Entity; ballEntity: Entity } {
  const paddleEntities = gameInstance.world.query("Paddle");
  const ballEntities = gameInstance.world.query("Ball");

  if (paddleEntities.length === 0 || ballEntities.length === 0) {
    throw new Error("Paddle or Ball entity not found in game world");
  }

  return {
    paddleEntity: paddleEntities[0],
    ballEntity: ballEntities[0]
  };
}
