import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry, Camera2DComponent, VisualOffsetComponent } from "../ecs/CoreComponents";

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

    const gameConfig = world.getResource<any>("GameConfig");
    const worldWidth = gameConfig?.WIDTH ?? gameConfig?.worldWidth;
    const worldHeight = gameConfig?.HEIGHT ?? gameConfig?.worldHeight;

    // Look for a player to follow automatically
    const players = world.query("Player" as any);
    let playerTransform: any = undefined;
    if (players.length > 0) {
      playerTransform = world.getComponent(players[0], "Transform" as any);
    }

    for (let i = 0; i < cameras.length; i++) {
      const camEntity = cameras[i];
      const cam = world.getComponent(camEntity, "Camera2D") as Camera2DComponent | undefined;
      if (!cam) continue;

      const zoom = cam.zoom || 1;

      world.mutateComponent(camEntity, "Camera2D", (mutableCam) => {
        // Smoothly update target top-left position if following player
        if (playerTransform) {
          mutableCam.targetX = playerTransform.x - (screenWidth / 2) / zoom;
          mutableCam.targetY = playerTransform.y - (screenHeight / 2) / zoom;
        }

        // Smooth follow using frame-rate independent lerp
        const speed = 5; // smooth speed
        const t = 1 - Math.exp(-speed * deltaTime);
        mutableCam.x += (mutableCam.targetX - mutableCam.x) * t;
        mutableCam.y += (mutableCam.targetY - mutableCam.y) * t;

        // Apply boundaries/limits if configured
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

  /**
   * Converts screen coordinates to world coordinates.
   */
  public static screenToWorld(
    world: World<any>,
    screenX: number,
    screenY: number,
    cameraEntity?: number
  ): { x: number; y: number } {
    let camEnt = cameraEntity;
    if (camEnt === undefined) {
      const cameras = world.query("Camera2D");
      for (let i = 0; i < cameras.length; i++) {
        const cam = world.getComponent(cameras[i], "Camera2D") as Camera2DComponent | undefined;
        if (cam?.isMain) {
          camEnt = cameras[i];
          break;
        }
      }
    }

    if (camEnt !== undefined) {
      const cam = world.getComponent(camEnt, "Camera2D") as Camera2DComponent | undefined;
      if (cam) {
        const visualOffset = world.getComponent(camEnt, "VisualOffset") as VisualOffsetComponent | undefined;
        const offsetX = visualOffset?.offsetX ?? 0;
        const offsetY = visualOffset?.offsetY ?? 0;
        const zoom = cam.zoom || 1;
        return {
          x: (screenX / zoom) + cam.x + offsetX,
          y: (screenY / zoom) + cam.y + offsetY
        };
      }
    }
    return { x: screenX, y: screenY };
  }

  /**
   * Converts world coordinates to screen coordinates.
   */
  public static worldToScreen(
    world: World<any>,
    worldX: number,
    worldY: number,
    cameraEntity?: number
  ): { x: number; y: number } {
    let camEnt = cameraEntity;
    if (camEnt === undefined) {
      const cameras = world.query("Camera2D");
      for (let i = 0; i < cameras.length; i++) {
        const cam = world.getComponent(cameras[i], "Camera2D") as Camera2DComponent | undefined;
        if (cam?.isMain) {
          camEnt = cameras[i];
          break;
        }
      }
    }

    if (camEnt !== undefined) {
      const cam = world.getComponent(camEnt, "Camera2D") as Camera2DComponent | undefined;
      if (cam) {
        const visualOffset = world.getComponent(camEnt, "VisualOffset") as VisualOffsetComponent | undefined;
        const offsetX = visualOffset?.offsetX ?? 0;
        const offsetY = visualOffset?.offsetY ?? 0;
        const zoom = cam.zoom || 1;
        return {
          x: (worldX - cam.x - offsetX) * zoom,
          y: (worldY - cam.y - offsetY) * zoom
        };
      }
    }
    return { x: worldX, y: worldY };
  }
}
