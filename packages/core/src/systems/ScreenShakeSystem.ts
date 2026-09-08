import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * System that evaluates screen shake timers and applies visual offsets to the primary camera.
 *
 * @remarks
 * In each tick, {@link ScreenShakeSystem} queries entities with a `ScreenShake` component and calculates the maximum
 * active shake intensity. Randomized render displacement is generated using `world.renderRandom` (ensuring gameplay determinism
 * is uninfluenced) and applied as a `VisualOffset` component on the primary `Camera2D` entity (`isMain === true`).
 *
 * Execution is skipped during netcode rollback re-simulation (`world.isReSimulating === true`).
 *
 * @example
 * ```ts
 * const screenShakeSystem = new ScreenShakeSystem();
 * world.addSystem(screenShakeSystem);
 * // Execution during tick applies camera visual offset:
 * screenShakeSystem.update(world, 0.016);
 * ```
 *
 * @public
 */
export class ScreenShakeSystem extends System<CoreComponentRegistry> {
  /**
   * Updates screen shake remaining durations and applies calculated camera visual displacement.
   *
   * @param world - Target ECS world containing entities and components.
   * @param deltaTime - Time elapsed in seconds since last frame update.
   */
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.isReSimulating) return;

    const entities = world.query("ScreenShake");
    const len = entities.length;
    let activeIntensity = 0;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const shakeCheck = world.getComponent(entity, "ScreenShake");
      if (!shakeCheck || shakeCheck.remaining <= 0) continue;

      // Safe for determinism/rollback. Only retrieve and update mutable ScreenShake if remaining time is greater than 0, avoiding stateVersion updates on finished shakes.
      const shake = world.getMutableComponent(entity, "ScreenShake")!;
      shake.remaining -= deltaTime;
      if (shake.remaining <= 0) {
        shake.remaining = 0;
        shake.intensity = 0;
      } else {
        if (shake.intensity > activeIntensity) {
          activeIntensity = shake.intensity;
        }
      }
    }

    const cameras = world.query("Camera2D");
    let mainCameraEntity: number | undefined;
    const camLen = cameras.length;
    for (let i = 0; i < camLen; i++) {
      const camEnt = cameras[i];
      const cam = world.getComponent(camEnt, "Camera2D");
      if (cam?.isMain) {
        mainCameraEntity = camEnt;
        break;
      }
    }

    if (mainCameraEntity !== undefined) {
      if (activeIntensity > 0) {
        const offsetX = (world.renderRandom.next() - 0.5) * 2 * activeIntensity;
        const offsetY = (world.renderRandom.next() - 0.5) * 2 * activeIntensity;

        if (!world.hasComponent(mainCameraEntity, "VisualOffset")) {
          world.commands.addComponent(mainCameraEntity, {
            type: "VisualOffset",
            offsetX: offsetX,
            offsetY: offsetY
          });
        } else {
          const vo = world.getMutableComponent(mainCameraEntity, "VisualOffset");
          if (vo) {
            vo.offsetX = offsetX;
            vo.offsetY = offsetY;
          }
        }
      } else {
        if (world.hasComponent(mainCameraEntity, "VisualOffset")) {
          const vo = world.getComponent(mainCameraEntity, "VisualOffset");
          // Safe for determinism/rollback. Only clear offset to 0 if they are not already 0, avoiding per-tick stateVersion increments of the main camera.
          if (vo && (vo.offsetX !== 0 || vo.offsetY !== 0)) {
            const mutableVo = world.getMutableComponent(mainCameraEntity, "VisualOffset");
            if (mutableVo) {
              mutableVo.offsetX = 0;
              mutableVo.offsetY = 0;
            }
          }
        }
      }
    }
  }
}
