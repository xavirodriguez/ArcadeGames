/**
 * Push-scroll camera for Hit&Run side-scrolling levels.
 *
 * Problems this fixes:
 * 1) GameConfig often has worldWidth === viewportWidth after init overwrite → camera clamped to 0.
 * 2) Default Camera2DSystem always centers the player; run-and-gun wants a right deadzone (~65%).
 *
 * Strategy: take ownership of the main Camera2D (clear followEntity so Camera2DSystem
 * only eases toward our targetX/targetY), then drive target with push-scroll math.
 */
import {
  System,
  SystemPhase,
  World,
  CoreComponentRegistry,
  Camera2DComponent,
  TransformComponent
} from "@tiny-aster/core";

const RIGHT_THRESHOLD = 0.65; // scroll when player crosses 65% of viewport
const LEFT_THRESHOLD = 0.28; // allow modest scroll-back
const SMOOTH = 8;

interface GameConfigLike {
  worldWidth?: number;
  worldHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  TILE_SIZE?: number;
  _hitRunBoundsFixed?: boolean;
}

export class HitRunCameraScrollSystem extends System<CoreComponentRegistry> {
  private owned = false;

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    this.ensureWorldBounds(world);
    this.ownMainCamera(world);
    this.drivePushScroll(world, deltaTime);
  }

  /** Expand worldWidth/Height from Tilemap if config was overwritten to viewport size. */
  private ensureWorldBounds(world: World<CoreComponentRegistry>): void {
    const cfg = world.getResource<GameConfigLike>("GameConfig");
    if (!cfg || cfg._hitRunBoundsFixed) return;

    const tileSize = cfg.TILE_SIZE ?? 40;
    let maxW = 0;
    let maxH = 0;

    const maps = world.query("Tilemap");
    for (let i = 0; i < maps.length; i++) {
      const tm = world.getComponent(maps[i], "Tilemap") as
        | { data?: number[][]; tileSize?: number }
        | undefined;
      if (!tm?.data || tm.data.length === 0) continue;
      const rows = tm.data.length;
      const cols = tm.data[0]?.length ?? 0;
      const ts = tm.tileSize ?? tileSize;
      maxW = Math.max(maxW, cols * ts);
      maxH = Math.max(maxH, rows * ts);
    }

    // SegmentGenerator may store plan dims on resource
    const plan = world.getResource<{ totalWidth?: number; totalHeight?: number }>("LevelPlan");
    if (plan?.totalWidth) {
      maxW = Math.max(maxW, plan.totalWidth * tileSize);
    }
    if (plan?.totalHeight) {
      maxH = Math.max(maxH, plan.totalHeight * tileSize);
    }

    const vpW = cfg.viewportWidth ?? cfg.worldWidth ?? 800;
    const vpH = cfg.viewportHeight ?? cfg.worldHeight ?? 600;

    // 5 segments × 20 tiles × 40px = 4000 — if still tiny, force a playable corridor
    if (maxW < vpW * 1.5) {
      maxW = Math.max(maxW, vpW * 5);
    }
    if (maxH < vpH) {
      maxH = Math.max(maxH, vpH);
    }

    world.setResource("GameConfig", {
      ...cfg,
      viewportWidth: vpW,
      viewportHeight: vpH,
      worldWidth: maxW,
      worldHeight: maxH,
      _hitRunBoundsFixed: true
    });
  }

  /** Stop Camera2DSystem from recentering; we drive targetX/Y. */
  private ownMainCamera(world: World<CoreComponentRegistry>): void {
    if (this.owned) return;
    const cams = world.query("Camera2D");
    for (let i = 0; i < cams.length; i++) {
      const cam = world.getComponent(cams[i], "Camera2D") as Camera2DComponent | undefined;
      if (!cam?.isMain) continue;
      world.mutateComponent(cams[i], "Camera2D", (c: Camera2DComponent & { followEntity?: number }) => {
        // Keep followEntity undefined so Camera2DSystem uses targetX/targetY branch
        (c as { followEntity?: number }).followEntity = undefined as unknown as number;
        delete (c as { followEntity?: number }).followEntity;
      });
      this.owned = true;
      break;
    }
  }

  private drivePushScroll(world: World<CoreComponentRegistry>, dt: number): void {
    const cfg = world.getResource<GameConfigLike>("GameConfig");
    const vpW = cfg?.viewportWidth ?? 800;
    const vpH = cfg?.viewportHeight ?? 600;
    const worldW = cfg?.worldWidth ?? vpW;
    const worldH = cfg?.worldHeight ?? vpH;

    const players = world.query("PlatformerInput", "Transform");
    if (players.length === 0) return;
    const player = players[0];
    const transform = world.getComponent(player, "Transform") as TransformComponent | undefined;
    if (!transform) return;

    const px = transform.worldX ?? transform.x;
    const py = transform.worldY ?? transform.y;

    const cams = world.query("Camera2D");
    for (let i = 0; i < cams.length; i++) {
      const camComp = world.getComponent(cams[i], "Camera2D") as Camera2DComponent | undefined;
      if (!camComp?.isMain) continue;

      const zoom = camComp.zoom || 1;
      const viewW = vpW / zoom;
      const viewH = vpH / zoom;

      const camX = camComp.x;
      const camY = camComp.y;

      // Player position relative to current camera (screen space)
      const screenX = px - camX;
      const screenY = py - camY;

      let desiredX = camX;
      let desiredY = camY;

      // Horizontal push-scroll
      const rightEdge = viewW * RIGHT_THRESHOLD;
      const leftEdge = viewW * LEFT_THRESHOLD;
      if (screenX > rightEdge) {
        desiredX = px - rightEdge;
      } else if (screenX < leftEdge) {
        desiredX = px - leftEdge;
      }

      // Vertical: soft center with deadzone
      const midY = viewH * 0.5;
      const vDead = 55;
      if (screenY > midY + vDead) {
        desiredY = py - (midY + vDead);
      } else if (screenY < midY - vDead) {
        desiredY = py - (midY - vDead);
      }

      // Clamp to world
      const maxX = Math.max(0, worldW - viewW);
      const maxY = Math.max(0, worldH - viewH);
      desiredX = Math.max(0, Math.min(desiredX, maxX));
      desiredY = Math.max(0, Math.min(desiredY, maxY));

      const t = 1 - Math.exp(-SMOOTH * Math.max(dt, 1 / 120));

      world.mutateComponent(cams[i], "Camera2D", (c: Camera2DComponent) => {
        c.targetX = desiredX;
        c.targetY = desiredY;
        // Drive x/y directly for snappy side-scroll (still smoothed)
        c.x += (desiredX - c.x) * t;
        c.y += (desiredY - c.y) * t;
        // Re-clamp after smooth
        c.x = Math.max(0, Math.min(c.x, maxX));
        c.y = Math.max(0, Math.min(c.y, maxY));
      });
      break;
    }
  }
}

export function registerHitRunCameraScroll(
  world: World<CoreComponentRegistry>
): void {
  world.addSystem(new HitRunCameraScrollSystem(), {
    phase: SystemPhase.Presentation,
    priority: 5 // after default Camera2DSystem (0)
  });
}
