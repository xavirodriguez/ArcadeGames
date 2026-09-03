import { System, World, CoreComponentRegistry } from "@tiny-aster/core";

export class PlatformerDamageSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    // TODO(refactor): código duplicado detectado (bloque) con echorunner/EchoRunnerGame.ts:121-147. Considerar extraer a función compartida. Ref: 72e3e047
    const players = world.query("PlatformerInput", "Health", "Transform");
    const enemies = world.query("Enemy", "Transform");

    for (let p = 0; p < players.length; p++) {
      const player = players[p];
      const pHealth = world.getComponent(player, "Health")!;
      const pTrans = world.getComponent(player, "Transform")!;

      let invRemaining = pHealth.invulnerableRemaining ?? 0;
      if (invRemaining > 0) {
        invRemaining -= deltaTime;
        if (invRemaining < 0) invRemaining = 0;
        world.mutateComponent(player, "Health", (h) => {
          h.invulnerableRemaining = invRemaining;
        });
      }

      if (invRemaining > 0) continue;

      let hit = false;
      for (let e = 0; e < enemies.length; e++) {
        const enemy = enemies[e];
        const eTrans = world.getComponent(enemy, "Transform")!;
        const dx = pTrans.x - eTrans.x;
        const dy = pTrans.y - eTrans.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 22) {
          hit = true;
          break;
        }
      }

      if (hit) {
        world.mutateComponent(player, "Health", (h) => {
          h.current--;
          h.invulnerableRemaining = 1.0;
        });

        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("PlaySFX", { name: "hit" });
        }
      }
    }
  }
}
