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
  worldWidth?: number;
  worldHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
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
  /**
   * Helper to retrieve configured or fallback viewport and world dimensions from resources.
   * @public
   */
  public static getViewportAndWorldDimensions<TRegistry extends CoreComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>
  ): { viewportWidth: number; viewportHeight: number; worldWidth?: number; worldHeight?: number } {
    const gameConfig = world.getResource<WorldSizeConfig>("GameConfig");
    const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig");
    return {
      viewportWidth: gameConfig?.viewportWidth ?? screenConfig?.width ?? 800,
      viewportHeight: gameConfig?.viewportHeight ?? screenConfig?.height ?? 600,
      worldWidth: gameConfig?.worldWidth,
      worldHeight: gameConfig?.worldHeight
    };
  }

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const cameras = world.query("Camera2D");
    const { viewportWidth, viewportHeight, worldWidth, worldHeight } = Camera2DSystem.getViewportAndWorldDimensions(world);

    for (let i = 0; i < cameras.length; i++) {
      const camEntity = cameras[i];
      const cam = world.getComponent(camEntity, "Camera2D") as Camera2DComponent | undefined;
      if (!cam) continue;

      const zoom = cam.zoom || 1;

      // Determine followed target position (single entity or group centroid/leader)
      let targetX: number | undefined;
      let targetY: number | undefined;
      let targetVelocityX = 0;

      if (cam.followEntities && cam.followEntities.length > 0) {
        let sumX = 0;
        let sumY = 0;
        let count = 0;
        for (let j = 0; j < cam.followEntities.length; j++) {
          const ent = cam.followEntities[j];
          if (world.hasEntity(ent)) {
            const tComp = world.getComponent(ent, "Transform") as TransformComponent | undefined;
            if (tComp) {
              sumX += tComp.x;
              sumY += tComp.y;
              count++;
            }
          }
        }
        if (count > 0) {
          targetX = sumX / count;
          targetY = sumY / count;
        }
      }

      if (targetX === undefined) {
        let targetEntity = cam.followEntity;
        if (targetEntity === undefined) {
          const players = world.query("Player" as Extract<keyof CoreComponentRegistry, string>);
          if (players.length > 0) targetEntity = players[0];
        }

        if (targetEntity !== undefined && world.hasEntity(targetEntity)) {
          const targetTransform = world.getComponent(targetEntity, "Transform") as TransformComponent | undefined;
          const targetVelocity = world.getComponent(targetEntity, "Velocity") as VelocityComponent | undefined;
          if (targetTransform) {
            targetX = targetTransform.x;
            targetY = targetTransform.y;
            targetVelocityX = targetVelocity?.vx ?? 0;
          }
        }
      }

      if (targetX !== undefined && targetY !== undefined) {
        const finalTargetX = targetX;
        const finalTargetY = targetY;
        const velX = targetVelocityX;
        world.mutateComponent(camEntity, "Camera2D", (mutableCam) => {
          const sign = velX > 0.01 ? 1 : (velX < -0.01 ? -1 : 0);
          const lookAheadOffset = sign * (mutableCam.lookAheadX ?? 0);

          const camCenterX = mutableCam.x + (viewportWidth / 2) / zoom;
          const camCenterY = mutableCam.y + (viewportHeight / 2) / zoom;

          const desiredCenterX = finalTargetX + lookAheadOffset;
          let desiredCenterY = camCenterY;

          const verticalDeadzone = mutableCam.verticalDeadzone ?? 0;
          const diffY = finalTargetY - camCenterY;

          if (Math.abs(diffY) > verticalDeadzone) {
            const excess = diffY - Math.sign(diffY) * verticalDeadzone;
            desiredCenterY = camCenterY + excess;
          }

          const desiredX = desiredCenterX - (viewportWidth / 2) / zoom;
          const desiredY = desiredCenterY - (viewportHeight / 2) / zoom;

          const smoothingX = mutableCam.smoothingX ?? 5;
          const smoothingY = mutableCam.smoothingY ?? 5;

          const tx = 1 - Math.exp(-smoothingX * deltaTime);
          const ty = 1 - Math.exp(-smoothingY * deltaTime);

          mutableCam.x += (desiredX - mutableCam.x) * tx;
          mutableCam.y += (desiredY - mutableCam.y) * ty;

          mutableCam.targetX = desiredX;
          mutableCam.targetY = desiredY;
        });
      } else {
        world.mutateComponent(camEntity, "Camera2D", (mutableCam) => {
          const speed = 5;
          const t = 1 - Math.exp(-speed * deltaTime);
          mutableCam.x += (mutableCam.targetX - mutableCam.x) * t;
          mutableCam.y += (mutableCam.targetY - mutableCam.y) * t;
        });
      }

      // Boundary clamping
      world.mutateComponent(camEntity, "Camera2D", (mutableCam) => {
        const viewW = viewportWidth / zoom;
        const viewH = viewportHeight / zoom;

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
   * Calculates the world-space bounding box of the active camera viewport.
   *
   * @param world - Simulation world instance.
   * @param cameraEntity - Optional explicit camera entity ID.
   * @returns Bounding box in world coordinates or null if no camera exists.
   */
  public static getViewportBounds<TRegistry extends CoreComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>,
    cameraEntity?: number
  ): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; zoom: number } | null {
    const info = Camera2DSystem.getMainCameraInfo(world, cameraEntity);
    if (!info) return null;

    const { viewportWidth, viewportHeight } = Camera2DSystem.getViewportAndWorldDimensions(world);

    const viewW = viewportWidth / info.zoom;
    const viewH = viewportHeight / info.zoom;
    const minX = info.cam.x + info.offsetX;
    const minY = info.cam.y + info.offsetY;

    return {
      minX,
      minY,
      maxX: minX + viewW,
      maxY: minY + viewH,
      width: viewW,
      height: viewH,
      zoom: info.zoom
    };
  }

  /**
   * Evaluates whether an entity is currently located within the active camera viewport.
   *
   * @param world - Simulation world.
   * @param entity - Target entity ID.
   * @param margin - Boundary tolerance margin in world units.
   * @param cameraEntity - Optional explicit camera entity ID.
   * @returns True if entity transform is inside the viewport bounds +/- margin.
   */
  public static isEntityInViewport<TRegistry extends CoreComponentRegistry = CoreComponentRegistry>(
    world: World<TRegistry>,
    entity: number,
    margin = 0,
    cameraEntity?: number
  ): boolean {
    const bounds = Camera2DSystem.getViewportBounds(world, cameraEntity);
    if (!bounds) return true;

    const transType = "Transform" as Extract<keyof TRegistry, string>;
    const trans = world.getComponent(entity, transType) as TransformComponent | undefined;
    if (!trans) return false;

    const x = trans.worldX ?? trans.x;
    const y = trans.worldY ?? trans.y;

    return (
      x >= bounds.minX - margin &&
      x <= bounds.maxX + margin &&
      y >= bounds.minY - margin &&
      y <= bounds.maxY + margin
    );
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
