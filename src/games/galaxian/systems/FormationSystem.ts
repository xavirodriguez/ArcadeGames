import { System, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, FormationComponent, GalaxianEnemyComponent } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";

export class FormationSystem extends System<GalaxianComponentRegistry> {
  private elapsed = 0;

  public update(world: World<GalaxianComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || deltaTime <= 0) return;

    const config = world.getResource<GalaxianConfig>("GameConfig");
    const amp = config?.formation.oscillationAmplitude ?? 60;
    const freq = config?.formation.oscillationFrequency ?? 0.35;

    const formationEntities = world.query("Formation");
    if (formationEntities.length === 0) return;
    const formationEntity = formationEntities[0];
    const formation = world.getMutableComponent(formationEntity, "Formation") as FormationComponent | undefined;
    if (!formation) return;

    this.elapsed += deltaTime;
    const currentOscillationX = Math.sin(this.elapsed * freq * 2 * Math.PI) * amp;
    formation.currentOscillationX = currentOscillationX;

    const enemyEntities = world.query("GalaxianEnemy", "Transform");
    for (const entity of enemyEntities) {
      const enemy = world.getComponent(entity, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
      const transform = world.getMutableComponent(entity, "Transform");
      if (!enemy || !transform) continue;

      if (enemy.state === "in_slot" || enemy.state === "windup") {
        const slot = formation.slots[enemy.slotId];
        if (slot) {
          transform.x = formation.originX + currentOscillationX + slot.x;
          transform.y = formation.originY + slot.y;
          transform.dirty = true;
        }
      }
    }
  }
}
