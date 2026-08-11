import { System, World } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

/**
 * System that handles specific render updates for Space Invaders.
 */
export class SpaceInvadersRenderSystem extends System<SpaceInvadersComponentRegistry> {
  public update(world: World<SpaceInvadersComponentRegistry>, _deltaTime: number): void {
    const renders = world.query("Render");

    renders.forEach(entity => {
      const health = world.getComponent(entity, "Health");
      if (!health) return;

      const render = world.getComponent(entity, "Render");
      if (!render) return;

      // Handle invulnerability blinking
      if (health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
        const remaining = health.invulnerableRemaining;

        // remaining is in seconds, convert to milliseconds to blink every 100ms
        const remainingMs = remaining * 1000;
        const visible = Math.floor(remainingMs / 100) % 2 !== 0;

        // extra rule: verify if fields changed before mutating to avoid unnecessary changes
        if (render.visible !== visible) {
          world.mutateComponent(entity, "Render", r => {
            r.visible = visible;
          });
        }
      } else {
        if (!render.visible) {
          world.mutateComponent(entity, "Render", r => {
            r.visible = true;
          });
        }
        const defaultColor = "#00FF00";
        if (render.shape === "player_ship" && render.color !== defaultColor) {
          // Mutación segura mediante mutateComponent
          world.mutateComponent(entity, "Render", r => {
            r.color = defaultColor;
          });
        }
      }
    });
  }
}
