import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * Generic system that updates the screen-space transform coordinates of parallax layers
 * based on their scroll factors, camera translations, and any independent auto-scrolling speeds.
 *
 * @public
 */
export class ParallaxSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.isReSimulating) return;

    // Find main camera translation and visual offset (e.g. for screen shake)
    let camX = 0;
    let camY = 0;
    let visualOffsetX = 0;
    let visualOffsetY = 0;

    const cameras = world.query("Camera2D");
    for (const camEnt of cameras) {
      const cam = world.getComponent(camEnt, "Camera2D");
      if (cam?.isMain) {
        camX = cam.x;
        camY = cam.y;

        const visualOffset = world.getComponent(camEnt, "VisualOffset");
        if (visualOffset) {
          visualOffsetX = visualOffset.offsetX ?? 0;
          visualOffsetY = visualOffset.offsetY ?? 0;
        }
        break;
      }
    }

    const layers = world.query("ParallaxLayer");
    for (const layerEnt of layers) {
      // 1. Accumulate auto-scroll displacement over time unless the layer is paused
      const layerComp = world.getComponent(layerEnt, "ParallaxLayer");
      if (!layerComp) continue;

      if (!layerComp.paused) {
        world.mutateComponent(layerEnt, "ParallaxLayer", (layer) => {
          if (layer.speedX !== undefined) {
            layer.autoScrollX = (layer.autoScrollX ?? 0) + layer.speedX * deltaTime;
          }
          if (layer.speedY !== undefined) {
            layer.autoScrollY = (layer.autoScrollY ?? 0) + layer.speedY * deltaTime;
          }
        });
      }

      // 2. Re-read mutated coordinates to perform screen-space positioning
      const updatedLayer = world.getComponent(layerEnt, "ParallaxLayer");
      if (!updatedLayer) continue;

      world.mutateComponent(layerEnt, "Transform", (transform) => {
        // Calculate raw scroll displacement
        const autoX = updatedLayer.autoScrollX ?? 0;
        const autoY = updatedLayer.autoScrollY ?? 0;

        // Apply classic formula: transform.x = initial - camera * factor + auto_displacement
        // We include screen shake (visualOffset) so the background shakes in synchronization with the game
        transform.x = updatedLayer.initialX - (camX + visualOffsetX) * updatedLayer.factorX + autoX;
        transform.y = updatedLayer.initialY - (camY + visualOffsetY) * updatedLayer.factorY + autoY;
        transform.dirty = true;
      });
    }
  }
}
