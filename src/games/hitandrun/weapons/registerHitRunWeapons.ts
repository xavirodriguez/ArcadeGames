import { SystemPhase, World, CoreComponentRegistry } from "@tiny-aster/core";
import { registerPlayerBulletPool } from "./HitRunBulletPool";
import { HitRunWeaponSystem } from "./HitRunWeaponSystem";
import { HitRunExplosionSystem } from "./HitRunExplosionSystem";
import { registerHitRunCombat } from "../systems/HitRunCombatBootstrap";

/**
 * Registra pool de balas + sistemas de arma, combate (daño) y explosión radial.
 * CombatSystem es obligatorio: sin él las balas colisionan pero no quitan vida.
 */
export function registerHitRunWeapons(
  world: World<CoreComponentRegistry>,
  opts?: { bulletPoolSize?: number }
): void {
  registerPlayerBulletPool(world, opts?.bulletPoolSize ?? 64);

  // Daño por colisión trigger (HMG / shotgun / rocket)
  registerHitRunCombat(world);

  const weaponSys = new HitRunWeaponSystem();
  world.addSystem(weaponSys, { phase: SystemPhase.Simulation, priority: 20 });

  const explosionSys = new HitRunExplosionSystem();
  world.addSystem(explosionSys, { phase: SystemPhase.GameRules, priority: 20 });

  const bus = world.getEventBus();
  if (bus) {
    explosionSys.subscribe(bus);
  }
}
