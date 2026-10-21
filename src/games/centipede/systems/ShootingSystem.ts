import { System, World, TouchInputState } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry, CentipedeInput } from "../types/CentipedeTypes";
import { CentipedeConfig, DEFAULT_CENTIPEDE_CONFIG } from "../types/CentipedeConfigSchema";
import { CentipedeEntityFactory } from "../EntityFactory";

export class ShootingSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, dt: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const inputState = world.getResource<CentipedeInput>("InputState");
    const unifiedInput = world.getResource<{ isDown: (action: string) => boolean }>("UnifiedInput");
    const touchState = world.getResource<TouchInputState>("TouchInputState");

    const activeDarts = world.query("Dart", "Transform");
    for (const dartEntity of activeDarts) {
      const transform = world.getComponent(dartEntity, "Transform")!;
      if (transform.y < 0) {
        world.commands.removeEntity(dartEntity);
      }
    }

    const currentDartCount = world.query("Dart").length;
    const shooters = world.query("Shooter", "Transform");

    let isFiring = false;
    if (unifiedInput) {
      if (unifiedInput.isDown("p1Fire") || unifiedInput.isDown("fire") || unifiedInput.isDown("p1Launch") || unifiedInput.isDown("launch")) {
        isFiring = true;
      }
    }
    if (inputState && (inputState.fire || inputState.p1Fire)) {
      isFiring = true;
    }
    if (touchState) {
      if (touchState.getButton("p1Fire") || touchState.getButton("fire") || touchState.consumeTaps().length > 0) {
        isFiring = true;
      }
    }

    for (const shooterEntity of shooters) {
      const shooter = world.getMutableComponent(shooterEntity, "Shooter");
      const transform = world.getComponent(shooterEntity, "Transform");

      if (!shooter || !transform) continue;

      if (shooter.fireCooldownMs > 0) {
        shooter.fireCooldownMs -= dt * 1000;
      }

      if (isFiring && shooter.fireCooldownMs <= 0 && currentDartCount < config.MAX_ACTIVE_DARTS) {
        CentipedeEntityFactory.createDart(world, transform.x, transform.y - config.CELL_SIZE * 0.5);
        shooter.fireCooldownMs = config.DART_COOLDOWN_MS;
      }
    }
  }
}
