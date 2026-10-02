import { SystemPhase, World, CoreComponentRegistry } from "@tiny-aster/core";
import { registerPlayerBulletPool } from "./HitRunBulletPool";
import { HitRunWeaponSystem } from "./HitRunWeaponSystem";
import { HitRunExplosionSystem } from "./HitRunExplosionSystem";

/**
 * Registra pool de balas + sistemas de arma y explosión radial.
 * Llamar desde HitAndRunGame.onRegisterSystems().
 */
export function registerHitRunWeapons(
  world: World<CoreComponentRegistry>,
  opts?: { bulletPoolSize?: number }
): void {
  registerPlayerBulletPool(world, opts?.bulletPoolSize ?? 64);

  const weaponSys = new HitRunWeaponSystem();
  world.addSystem(weaponSys, { phase: SystemPhase.Simulation, priority: 20 });

  const explosionSys = new HitRunExplosionSystem();
  world.addSystem(explosionSys, { phase: SystemPhase.GameRules, priority: 20 });

  const bus = world.getEventBus();
  if (bus) {
    explosionSys.subscribe(bus);
  }
}
