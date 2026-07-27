import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/** @public */
export class ScreenShakeSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.isReSimulating) return;

    const entities = world.query("ScreenShake");
    let activeIntensity = 0;

    for (const entity of entities) {
      world.mutateComponent(entity, "ScreenShake", shake => {
        shake.remaining -= deltaTime;
        if (shake.remaining <= 0) {
          shake.remaining = 0;
          shake.intensity = 0;
        } else {
          if (shake.intensity > activeIntensity) {
            activeIntensity = shake.intensity;
          }
        }
      });
    }

    const cameras = world.query("Camera2D");
    let mainCameraEntity: number | undefined;
    for (const camEnt of cameras) {
      const cam = world.getComponent(camEnt, "Camera2D");
      if (cam?.isMain) {
        mainCameraEntity = camEnt;
        break;
      }
    }

    if (mainCameraEntity !== undefined) {
      if (activeIntensity > 0) {
        const offsetX = (Math.random() - 0.5) * 2 * activeIntensity;
        const offsetY = (Math.random() - 0.5) * 2 * activeIntensity;

        if (!world.hasComponent(mainCameraEntity, "VisualOffset")) {
          world.addComponent(mainCameraEntity, {
            type: "VisualOffset",
            offsetX: 0,
            offsetY: 0
          });
        }
        world.mutateComponent(mainCameraEntity, "VisualOffset", vo => {
          vo.offsetX = offsetX;
          vo.offsetY = offsetY;
        });
      } else {
        if (world.hasComponent(mainCameraEntity, "VisualOffset")) {
          world.mutateComponent(mainCameraEntity, "VisualOffset", vo => {
            vo.offsetX = 0;
            vo.offsetY = 0;
          });
        }
      }
    }
  }
}
