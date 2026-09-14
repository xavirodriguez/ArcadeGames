import { System, World, CoreComponentRegistry } from "@tiny-aster/core";
import { updatePlayerInvulnerabilityAndContactDamage } from "@tiny-aster/gameplay-kit";

export class PlatformerDamageSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    updatePlayerInvulnerabilityAndContactDamage(world, deltaTime, {
      contactDistance: 22,
      invulnerabilityDuration: 1.0,
      damageAmount: 1,
      sfxName: "hit"
    });
  }
}
