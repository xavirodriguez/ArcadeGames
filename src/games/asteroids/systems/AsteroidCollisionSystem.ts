/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TEMPORARY STUB — restore from master before merge.
 * See mods/iceberg/FRACTURE_WIRING.md
 *
 * This stub only exists because the automated push truncated the full system.
 * Run: git checkout master -- src/games/asteroids/systems/AsteroidCollisionSystem.ts
 * Then apply the iceShard branch from FRACTURE_WIRING.md
 */
import { World, System } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";

export class AsteroidCollisionSystem extends System<
  AsteroidsComponentRegistry,
  AsteroidsEventRegistry
> {
  public update(
    _world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    _deltaTime: number
  ): void {
    // Intentionally empty until full file is restored from master.
  }

  public dispose(): void {}
}
