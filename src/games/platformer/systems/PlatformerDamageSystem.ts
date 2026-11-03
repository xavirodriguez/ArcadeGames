import { System, World, CoreComponentRegistry } from "@tiny-aster/core";
import { updatePlayerInvulnerabilityAndContactDamage } from "@tiny-aster/gameplay-kit";
import { JuiceOrchestrator } from "../../shared/rendering/JuiceOrchestrator";

export class PlatformerDamageSystem extends System<CoreComponentRegistry> {
  private readonly previousHealth = new Map<number, number>();
  private juice: JuiceOrchestrator<CoreComponentRegistry> | undefined;

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    // Seed the health snapshot before damage processing so first-frame hits are observable.
    const initialPlayers = world.query("Tag", "Health");
    for (let i = 0; i < initialPlayers.length; i++) {
      const entity = initialPlayers[i];
      const tag = world.getComponent(entity, "Tag");
      const health = world.getComponent(entity, "Health");
      if (tag?.tags?.includes("Player") && health && !this.previousHealth.has(entity)) {
        this.previousHealth.set(entity, health.current);
      }
    }

    updatePlayerInvulnerabilityAndContactDamage(world, deltaTime, {
      contactDistance: 22,
      invulnerabilityDuration: 1.0,
      damageAmount: 1,
      sfxName: "hit"
    });

    // Presentation-only edge detection: emit one impact when player health decreases.
    this.juice ??= new JuiceOrchestrator(world);
    const players = world.query("Tag", "Health", "Transform");
    for (let i = 0; i < players.length; i++) {
      const entity = players[i];
      const tag = world.getComponent(entity, "Tag");
      if (!tag?.tags?.includes("Player")) continue;
      const health = world.getComponent(entity, "Health");
      const transform = world.getComponent(entity, "Transform");
      if (!health || !transform) continue;
      const previous = this.previousHealth.get(entity);
      if (previous !== undefined && health.current < previous && !world.isReSimulating) {
        this.juice.spawn("pixelfx_impact", {
          x: transform.x,
          y: transform.y,
          scale: 1.0,
          tint: "#e85d4a",
          ttl: 0.28
        });
      }
      this.previousHealth.set(entity, health.current);
    }
  }
}
