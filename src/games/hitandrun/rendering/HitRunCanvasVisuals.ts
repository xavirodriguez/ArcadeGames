/**
 * Hit & Run entity and projectile drawers using the shared presentation contract.
 * ECS components are projected to immutable snapshots before a theme receives them.
 */
import type {
  CoreComponentRegistry,
  RenderContext,
  ShapeDrawer,
  World
} from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import { CanvasPresentationPainter } from "../../shared/presentation/backends/CanvasPresentationPainter";
import { SkiaPresentationPainter } from "../../shared/presentation/backends/SkiaPresentationPainter";
import type { PresentationFrame, PresentationPainter } from "../../shared/presentation/PresentationContracts";
import type { HitRunPresentationEntitySnapshot } from "./theme/HitRunPresentationSnapshots";
import {
  getHitRunPresentationSession,
  type HitRunPresentationSession
} from "./theme/HitRunPresentationSession";
import { getInterpolatedPosition } from "./HitRunRenderInterpolation";
import type { BeltElevationComponent } from "../belt/BeltElevationComponent";

const canvasPainters = new WeakMap<CanvasRenderingContext2D, CanvasPresentationPainter>();
const skiaPainters = new WeakMap<SkCanvas, SkiaPresentationPainter>();

function getCanvasPainter(context: CanvasRenderingContext2D): CanvasPresentationPainter {
  const existing = canvasPainters.get(context);
  if (existing) return existing;
  const painter = new CanvasPresentationPainter(context);
  canvasPainters.set(context, painter);
  return painter;
}

function getSkiaPainter(context: SkCanvas): SkiaPresentationPainter {
  const existing = skiaPainters.get(context);
  if (existing) return existing;
  const painter = new SkiaPresentationPainter(context);
  skiaPainters.set(context, painter);
  return painter;
}

function createFrame(world: World<CoreComponentRegistry>): PresentationFrame {
  const config = world.getResource<{
    readonly viewportWidth?: number;
    readonly viewportHeight?: number;
    readonly worldWidth?: number;
    readonly worldHeight?: number;
  }>("GameConfig");
  const tick = world.tick ?? 0;
  return {
    frameId: tick,
    tick,
    elapsedSeconds: tick / 60,
    deltaSeconds: 0,
    viewport: {
      width: config?.viewportWidth ?? config?.worldWidth ?? 800,
      height: config?.viewportHeight ?? config?.worldHeight ?? 600,
      pixelRatio: 1
    },
    camera: {
      x: 0,
      y: 0,
      zoom: 1,
      visualOffsetX: 0,
      visualOffsetY: 0
    },
    reduceMotion: false,
    highContrast: false
  };
}

export function buildHitRunEntitySnapshot(
  world: World<CoreComponentRegistry>,
  entity: number,
  visualId: string,
  defaultSize: number
): HitRunPresentationEntitySnapshot | null {
  const render = world.getComponent(entity, "Render");
  const transform = world.getComponent(entity, "Transform");
  if (!render?.visible || !transform) return null;

  const elevation = (world.getComponent(entity, "BeltElevation") as BeltElevationComponent | undefined)?.z ?? 0;
  const position = getInterpolatedPosition(world, entity, 1);
  const samuraiState = visualId === "samurai"
    ? world.getComponent(entity, "StateMachine")?.currentState
    : undefined;
  const normalizedSamuraiState = samuraiState?.toLowerCase();
  const size = Math.max(1, render.size ?? defaultSize);
  const isProjectile = visualId === "bullet" || visualId === "rocket";

  return {
    entityId: String(entity),
    visualId,
    role: visualId === "player" ? "player" : isProjectile ? "projectile" : "hostile",
    transform: {
      x: position.x,
      y: position.y,
      rotationRadians: transform.rotation ?? 0,
      scaleX: transform.scaleX ?? 1,
      scaleY: transform.scaleY ?? 1
    },
    opacity: render.opacity,
    elevation,
    facing: (transform.scaleX ?? 1) >= 0 ? 1 : -1,
    hitFlash: render.hitFlashFrames,
    tint: render.color,
    custom: {
      size,
      depth: position.y,
      isDead: world.hasComponent(entity, "Dead"),
      ...(samuraiState !== undefined ? { samuraiState } : {}),
      samuraiWindup: normalizedSamuraiState?.includes("windup") === true
        || normalizedSamuraiState?.includes("anticipation") === true,
      samuraiAttack: normalizedSamuraiState?.includes("attack") === true
        || normalizedSamuraiState?.includes("charge") === true,
      shadowSizeMultiplier: isProjectile ? 1.5 : 1,
      ...(visualId === "samurai" ? { shadowRxRatio: 0.42, shadowRyRatio: 0.12 } : {}),
      ...(isProjectile ? { shadowRxRatio: 0.4, shadowRyRatio: 0.12 } : {})
    }
  };
}

function drawEntity(
  world: World<CoreComponentRegistry>,
  entity: number,
  visualId: string,
  defaultSize: number,
  painter: PresentationPainter,
  session: HitRunPresentationSession
): void {
  const snapshot = buildHitRunEntitySnapshot(world, entity, visualId, defaultSize);
  if (!snapshot) return;
  const frame = createFrame(world);
  session.theme.renderGroundShadow?.(painter, snapshot, frame);
  session.theme.renderEntity?.(painter, snapshot, frame);
}

function drawProjectile(
  world: World<CoreComponentRegistry>,
  entity: number,
  visualId: string,
  defaultSize: number,
  painter: PresentationPainter,
  session: HitRunPresentationSession
): void {
  const snapshot = buildHitRunEntitySnapshot(world, entity, visualId, defaultSize);
  if (!snapshot) return;
  const frame = createFrame(world);
  session.theme.renderGroundShadow?.(painter, snapshot, frame);
  session.theme.renderProjectile?.(painter, snapshot, frame);
}

function createCanvasDrawer(
  visualId: string,
  defaultSize: number,
  projectile = false
): ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> {
  return {
    draw(context, world, entity) {
      const session = getHitRunPresentationSession(world);
      const painter = getCanvasPainter(context);
      if (projectile) {
        drawProjectile(world, entity, visualId, defaultSize, painter, session);
      } else {
        drawEntity(world, entity, visualId, defaultSize, painter, session);
      }
    }
  };
}

function createSkiaDrawer(
  visualId: string,
  defaultSize: number,
  projectile = false
): ShapeDrawer<RenderContext, CoreComponentRegistry> {
  return {
    draw(context, world, entity) {
      const canvas = context as never as SkCanvas;
      if (!canvas || typeof canvas.drawRect !== "function") return;
      const session = getHitRunPresentationSession(world);
      const painter = getSkiaPainter(canvas);
      if (projectile) {
        drawProjectile(world, entity, visualId, defaultSize, painter, session);
      } else {
        drawEntity(world, entity, visualId, defaultSize, painter, session);
      }
    }
  };
}

export const drawHitRunPlayer = createCanvasDrawer("player", 24);
export const drawHitRunPopcorn = createCanvasDrawer("popcorn", 10);
export const drawHitRunWallTrooper = createCanvasDrawer("wall_trooper", 14);
export const drawHitRunHopper = createCanvasDrawer("hopper", 12);
export const drawHitRunCharger = createCanvasDrawer("charger", 14);
export const drawHitRunElite = createCanvasDrawer("elite", 22);
export const drawHitRunSamuraiFallback = createCanvasDrawer("samurai", 32);
export const drawHitRunBullet = createCanvasDrawer("bullet", 3, true);
export const drawHitRunRocket = createCanvasDrawer("rocket", 7, true);

export const drawHitRunPlayerSkia = createSkiaDrawer("player", 24);
export const drawHitRunPopcornSkia = createSkiaDrawer("popcorn", 10);
export const drawHitRunWallTrooperSkia = createSkiaDrawer("wall_trooper", 14);
export const drawHitRunHopperSkia = createSkiaDrawer("hopper", 12);
export const drawHitRunChargerSkia = createSkiaDrawer("charger", 14);
export const drawHitRunEliteSkia = createSkiaDrawer("elite", 22);
export const drawHitRunSamuraiFallbackSkia = createSkiaDrawer("samurai", 32);
export const drawHitRunBulletSkia = createSkiaDrawer("bullet", 3, true);
export const drawHitRunRocketSkia = createSkiaDrawer("rocket", 7, true);
