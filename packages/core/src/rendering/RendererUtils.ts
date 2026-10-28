import { Renderer, RenderContext } from "./Renderer";
import { ComponentRegistry } from "../ecs/Component";
import { Entity } from "../ecs/Entity";
import { World } from "../ecs/World";
import {
  RenderComponent,
  TransformComponent,
  Camera2DComponent,
  VisualOffsetComponent,
} from "../ecs/CoreComponents";

/**
 * Callback function for registering renderer elements.
 * @public
 */
export type RendererRegistrationCallback<TReg extends ComponentRegistry = ComponentRegistry, TContext = unknown> =
  (renderer: Renderer<TReg, TContext>) => void;

/**
 * Configuration for registration callbacks across different rendering pipelines.
 * @public
 */
export interface RendererRegistrationConfig<TReg extends ComponentRegistry = ComponentRegistry> {
  canvas?: (renderer: Renderer<TReg, CanvasRenderingContext2D>) => void;
  skia?: (renderer: Renderer<TReg, unknown>) => void;
}

/**
 * Utility functions for managing different rendering implementations.
 * @public
 */
export class RendererUtils {
  /**
   * Registra assets, formas y efectos basándose en el tipo de renderizador activo.
   * Elimina la necesidad de hacer branching (if/else) y casteo manual (as any)
   * en las clases de los juegos.
   */
  public static registerAssets<T extends ComponentRegistry>(
    renderer: Renderer<T, unknown>,
    config: RendererRegistrationConfig<T>
  ): void {
    const rendererType = (renderer as unknown as { type?: string }).type;

    if (rendererType === "canvas" && config.canvas) {
      config.canvas(renderer);
    } else if (rendererType === "skia" && config.skia) {
      config.skia(renderer);
    } else if (!rendererType) {
      console.warn("[RendererUtils] No se pudo determinar el tipo de renderizador (missing 'type' property).");
    }
  }
}

/**
 * Resolves effective viewport width and height from a GameConfig resource.
 * @public
 */
export function resolveViewportDimensions(
  gameConfig?: { worldWidth?: number; worldHeight?: number; viewportWidth?: number; viewportHeight?: number }
): { viewportWidth: number; viewportHeight: number } {
  const viewportWidth = gameConfig?.viewportWidth ?? (gameConfig?.worldWidth && gameConfig.worldWidth < 2000 ? gameConfig.worldWidth : 800);
  const viewportHeight = gameConfig?.viewportHeight ?? (gameConfig?.worldHeight && gameConfig.worldHeight < 2000 ? gameConfig.worldHeight : 600);
  return { viewportWidth, viewportHeight };
}

/**
 * Pre-extracted, sorted entry used by both Canvas and Skia backends.
 * Fields needed for the deterministic comparator are cached so the sort
 * comparator never calls getComponent.
 *
 * @public
 */
export interface RenderQueueEntry {
  entity: Entity;
  render: RenderComponent;
  transform: TransformComponent;
  order: number;
  depthSort: boolean;
  y: number;
  shape?: string;
  color?: string;
}

/**
 * Resolved main-camera state (world units).
 * @public
 */
export interface RenderCameraState {
  x: number;
  y: number;
  zoom: number;
  visualOffsetX: number;
  visualOffsetY: number;
}

/**
 * Immutable-ish render plan produced by {@link buildRenderPlan}.
 * Backends consume `entries` (already filtered + sorted) and `mainCamera`.
 *
 * @public
 */
export interface RenderPlan {
  /** Visible entities sorted with the 5-clause deterministic comparator. */
  entries: RenderQueueEntry[];
  /** Main camera state, or null when no main camera is present. */
  mainCamera: RenderCameraState | null;
  /** Resolved logical viewport width. */
  viewportWidth: number;
  /** Resolved logical viewport height. */
  viewportHeight: number;
}

/**
 * Sorts entities in-place using a fully deterministic 5-clause comparator that
 * matches the behaviour historically used by CanvasRenderer:
 *
 *   1. render.order          (ascending)
 *   2. depthSort Y           (only when both entities have depthSort === true)
 *   3. render.shape          (alphabetical, empty string for missing)
 *   4. render.color          (alphabetical, empty string for missing)
 *   5. entity id             (strict numeric tie-break)
 *
 * Prefer {@link buildRenderPlan} for new code; this function remains for
 * callers that already hold a plain Entity[] (e.g. tests).
 *
 * @public
 */
export function sortEntitiesByRenderOrder<TRegistry extends ComponentRegistry>(
  sortedEntities: Entity[],
  world: World<TRegistry>,
  renderType: Extract<keyof TRegistry, string>,
  transformType: Extract<keyof TRegistry, string>
): void {
  sortedEntities.sort((a, b) => {
    const renderA = world.getComponent(a, renderType) as RenderComponent | undefined;
    const renderB = world.getComponent(b, renderType) as RenderComponent | undefined;

    const orderA = renderA?.order || 0;
    const orderB = renderB?.order || 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    if (renderA?.depthSort && renderB?.depthSort) {
      const transformA = world.getComponent(a, transformType) as TransformComponent | undefined;
      const transformB = world.getComponent(b, transformType) as TransformComponent | undefined;
      const yA = transformA ? (transformA.worldY ?? transformA.y) : 0;
      const yB = transformB ? (transformB.worldY ?? transformB.y) : 0;
      if (yA !== yB) {
        return yA - yB;
      }
    }

    const shapeA = renderA?.shape ?? "";
    const shapeB = renderB?.shape ?? "";
    if (shapeA !== shapeB) {
      return shapeA < shapeB ? -1 : 1;
    }

    const colorA = renderA?.color ?? "";
    const colorB = renderB?.color ?? "";
    if (colorA !== colorB) {
      return colorA < colorB ? -1 : 1;
    }

    return a - b;
  });
}

/**
 * Comparator used by {@link buildRenderPlan} on pre-extracted entries
 * (zero getComponent calls during sort).
 */
function compareRenderQueueEntries(a: RenderQueueEntry, b: RenderQueueEntry): number {
  if (a.order !== b.order) {
    return a.order - b.order;
  }
  if (a.depthSort && b.depthSort) {
    if (a.y !== b.y) {
      return a.y - b.y;
    }
  }
  const shapeA = a.shape ?? "";
  const shapeB = b.shape ?? "";
  if (shapeA !== shapeB) {
    return shapeA < shapeB ? -1 : 1;
  }
  const colorA = a.color ?? "";
  const colorB = b.color ?? "";
  if (colorA !== colorB) {
    return colorA < colorB ? -1 : 1;
  }
  return a.entity - b.entity;
}

/**
 * Builds a deterministic render plan from the current world state.
 *
 * Responsibilities:
 * - Resolve viewport dimensions from GameConfig
 * - Query Transform+Render entities
 * - Filter out invisible / zero-opacity entities
 * - Pre-extract sort keys into {@link RenderQueueEntry}
 * - Sort with the 5-clause deterministic comparator
 * - Resolve the main Camera2D (+ VisualOffset) if present
 *
 * Not included (backend-specific):
 * - Letterboxing / DPR / surface clear
 * - Background effects
 * - Actual drawing / shape drawers
 * - Scene transitions
 *
 * @param world - ECS world to plan for
 * @param entriesBuffer - Optional reusable array to avoid per-frame allocation
 *   (CanvasRenderer pattern). When provided and large enough it is reused;
 *   otherwise a new array is allocated. The returned plan.entries is always
 *   this buffer (trimmed via length) or a fresh array.
 * @public
 */
export function buildRenderPlan<TRegistry extends ComponentRegistry>(
  world: World<TRegistry>,
  entriesBuffer?: RenderQueueEntry[]
): RenderPlan {
  const transformType = "Transform" as Extract<keyof TRegistry, string>;
  const renderType = "Render" as Extract<keyof TRegistry, string>;
  const cameraType = "Camera2D" as Extract<keyof TRegistry, string>;
  const visualOffsetType = "VisualOffset" as Extract<keyof TRegistry, string>;

  const gameConfig = world.getResource<{
    worldWidth?: number;
    worldHeight?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  }>("GameConfig");
  const { viewportWidth, viewportHeight } = resolveViewportDimensions(gameConfig);

  const entities = world.query(transformType, renderType);

  // Reuse or allocate the entries buffer
  let entries: RenderQueueEntry[];
  if (entriesBuffer) {
    entries = entriesBuffer;
    if (entries.length < entities.length) {
      // Grow without discarding existing slots
      entries.length = entities.length;
    }
  } else {
    entries = new Array(entities.length);
  }

  let writeIndex = 0;
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const render = world.getComponent(entity, renderType) as RenderComponent | undefined;
    const transform = world.getComponent(entity, transformType) as TransformComponent | undefined;

    // Filter invisible / fully transparent early so they never enter the queue
    if (!render || !transform || !render.visible || render.opacity === 0) {
      continue;
    }

    const order = render.order || 0;
    const depthSort = render.depthSort === true;
    const y = transform.worldY ?? transform.y;
    const shape = render.shape;
    const color = render.color;

    let entry = entries[writeIndex];
    if (!entry) {
      entry = { entity, render, transform, order, depthSort, y, shape, color };
      entries[writeIndex] = entry;
    } else {
      entry.entity = entity;
      entry.render = render;
      entry.transform = transform;
      entry.order = order;
      entry.depthSort = depthSort;
      entry.y = y;
      entry.shape = shape;
      entry.color = color;
    }
    writeIndex++;
  }

  // Trim to the number of visible entities
  entries.length = writeIndex;

  // Deterministic sort on pre-extracted keys
  entries.sort(compareRenderQueueEntries);

  // Resolve main camera
  let mainCamera: RenderCameraState | null = null;
  const cameras = world.query(cameraType);
  for (let i = 0; i < cameras.length; i++) {
    const cam = world.getComponent(cameras[i], cameraType) as Camera2DComponent | undefined;
    if (cam?.isMain) {
      let visualOffsetX = 0;
      let visualOffsetY = 0;
      const visualOffset = world.getComponent(cameras[i], visualOffsetType) as VisualOffsetComponent | undefined;
      if (visualOffset) {
        visualOffsetX = visualOffset.offsetX;
        visualOffsetY = visualOffset.offsetY;
      }
      mainCamera = {
        x: cam.x,
        y: cam.y,
        zoom: cam.zoom,
        visualOffsetX,
        visualOffsetY,
      };
      break;
    }
  }

  return {
    entries,
    mainCamera,
    viewportWidth,
    viewportHeight,
  };
}
