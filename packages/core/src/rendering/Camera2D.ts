import { System } from "../ecs/System";
import { World } from "../ecs/World";
import {
  CoreComponentRegistry,
  Camera2DComponent,
  VisualOffsetComponent,
  TransformComponent,
  VelocityComponent
} from "../ecs/CoreComponents";

interface WorldSizeConfig {
  WIDTH?: number;
  HEIGHT?: number;
  worldWidth?: number;
  worldHeight?: number;
}

/**
 * System that manages 2D camera transformations.
 *
 * @remarks
 * This system updates camera position and zoom based on `Camera2D` components.
 * It is typically executed in the `Presentation` phase to prepare for rendering.
 * @public
 */
export class Camera2DSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const cameras = world.query("Camera2D");
    const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig");
    const screenWidth = screenConfig?.width ?? 800;
    const screenHeight = screenConfig?.height ?? 600;

    const gameConfig = world.getResource<WorldSizeConfig>("GameConfig");
    const worldWidth = gameConfig?.WIDTH ?? gameConfig?.worldWidth;
    const worldHeight = gameConfig?.HEIGHT ?? gameConfig?.worldHeight;

    for (let i = 0; i < cameras.length; i++) {
      const camEntity = cameras[i];
      const cam = world.getComponent(camEntity, "Camera2D") as Camera2DComponent | undefined;
      if (!cam) continue;

      const zoom = cam.zoom || 1;

      // Determine followed entity
      let targetEntity = cam.followEntity;
      if (targetEntity === undefined) {
        const players = world.query("Player" as Extract<keyof CoreComponentRegistry, string>);
        if (players.length > 0) {
          targetEntity = players[0];
        }
      }

      if (targetEntity !== undefined && world.hasEntity(targetEntity)) {
        const targetTransform = world.getComponent(targetEntity, "Transform") as TransformComponent | undefined;
        const targetVelocity = world.getComponent(targetEntity, "Velocity") as VelocityComponent | undefined;

        if (targetTransform) {
          world.mutateComponent(camEntity, "Camera2D", (mutableCam) => {
            // Horizontal look-ahead offset
            const sign = targetVelocity ? (targetVelocity.vx > 0.01 ? 1 : (targetVelocity.vx < -0.01 ? -1 : 0)) : 0;
            const lookAheadOffset = sign * (mutableCam.lookAheadX ?? 0);

            const camCenterX = mutableCam.x + (screenWidth / 2) / zoom;
            const camCenterY = mutableCam.y + (screenHeight / 2) / zoom;

            const desiredCenterX = targetTransform.x + lookAheadOffset;
            let desiredCenterY = camCenterY;

            // Vertical deadzone constraint
            const verticalDeadzone = mutableCam.verticalDeadzone ?? 0;
            const diffY = targetTransform.y - camCenterY;

            if (Math.abs(diffY) > verticalDeadzone) {
              const excess = diffY - Math.sign(diffY) * verticalDeadzone;
              desiredCenterY = camCenterY + excess;
            }

            const desiredX = desiredCenterX - (screenWidth / 2) / zoom;
            const desiredY = desiredCenterY - (screenHeight / 2) / zoom;

            // Exponential smoothing factors
            const smoothingX = mutableCam.smoothingX ?? 5;
            const smoothingY = mutableCam.smoothingY ?? 5;

            const tx = 1 - Math.exp(-smoothingX * deltaTime);
            const ty = 1 - Math.exp(-smoothingY * deltaTime);

            mutableCam.x += (desiredX - mutableCam.x) * tx;
            mutableCam.y += (desiredY - mutableCam.y) * ty;

            mutableCam.targetX = desiredX;
            mutableCam.targetY = desiredY;
          });
        }
      } else {
        // Fallback or smooth towards manual targetX/targetY if no follow entity
        world.mutateComponent(camEntity, "Camera2D", (mutableCam) => {
          const speed = 5;
          const t = 1 - Math.exp(-speed * deltaTime);
          mutableCam.x += (mutableCam.targetX - mutableCam.x) * t;
          mutableCam.y += (mutableCam.targetY - mutableCam.y) * t;
        });
      }

      // Boundary clamping
      world.mutateComponent(camEntity, "Camera2D", (mutableCam) => {
        const viewW = screenWidth / zoom;
        const viewH = screenHeight / zoom;

        if (worldWidth !== undefined) {
          const minX = 0;
          const maxX = Math.max(0, worldWidth - viewW);
          mutableCam.x = Math.max(minX, Math.min(mutableCam.x, maxX));
        }
        if (worldHeight !== undefined) {
          const minY = 0;
          const maxY = Math.max(0, worldHeight - viewH);
          mutableCam.y = Math.max(minY, Math.min(mutableCam.y, maxY));
        }
      });
    }
  }

  private static getMainCameraInfo<TRegistry extends CoreComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>,
    cameraEntity?: number
  ): { cam: Camera2DComponent; offsetX: number; offsetY: number; zoom: number } | null {
    const camType = "Camera2D" as Extract<keyof TRegistry, string>;
    const offsetType = "VisualOffset" as Extract<keyof TRegistry, string>;

    let camEnt = cameraEntity;
    if (camEnt === undefined) {
      const cameras = world.query(camType);
      for (let i = 0; i < cameras.length; i++) {
        const cam = world.getComponent(cameras[i], camType) as Camera2DComponent | undefined;
        if (cam?.isMain) {
          camEnt = cameras[i];
          break;
        }
      }
    }

    if (camEnt !== undefined) {
      const cam = world.getComponent(camEnt, camType) as Camera2DComponent | undefined;
      if (cam) {
        const visualOffset = world.getComponent(camEnt, offsetType) as VisualOffsetComponent | undefined;
        const offsetX = visualOffset?.offsetX ?? 0;
        const offsetY = visualOffset?.offsetY ?? 0;
        const zoom = cam.zoom || 1;
        return { cam, offsetX, offsetY, zoom };
      }
    }
    return null;
  }

  /**
   * Converts screen coordinates to world coordinates.
   */
  public static screenToWorld<TRegistry extends CoreComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>,
    screenX: number,
    screenY: number,
    cameraEntity?: number
  ): { x: number; y: number } {
    const info = Camera2DSystem.getMainCameraInfo(world, cameraEntity);
    if (info) {
      return {
        x: (screenX / info.zoom) + info.cam.x + info.offsetX,
        y: (screenY / info.zoom) + info.cam.y + info.offsetY
      };
    }
    return { x: screenX, y: screenY };
  }

  /**
   * Converts world coordinates to screen coordinates.
   */
  public static worldToScreen<TRegistry extends CoreComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>,
    worldX: number,
    worldY: number,
    cameraEntity?: number
  ): { x: number; y: number } {
    const info = Camera2DSystem.getMainCameraInfo(world, cameraEntity);
    if (info) {
      return {
        x: (worldX - info.cam.x - info.offsetX) * info.zoom,
        y: (worldY - info.cam.y - info.offsetY) * info.zoom
      };
    }
    return { x: worldX, y: worldY };
  }
}
