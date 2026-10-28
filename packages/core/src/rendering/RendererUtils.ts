import { Renderer, RenderContext } from "./Renderer";
import { ComponentRegistry } from "../ecs/Component";
import { Entity } from "../ecs/Entity";
import { World } from "../ecs/World";
import { RenderComponent, TransformComponent } from "../ecs/CoreComponents";

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
 * Sorts entities in-place using a fully deterministic 5-clause comparator that
 * matches the behaviour historically used by CanvasRenderer:
 *
 *   1. render.order          (ascending)
 *   2. depthSort Y           (only when both entities have depthSort === true)
 *   3. render.shape          (alphabetical, empty string for missing)
 *   4. render.color          (alphabetical, empty string for missing)
 *   5. entity id             (strict numeric tie-break)
 *
 * This guarantees identical draw order between the Canvas and Skia backends
 * and removes dependence on ECS query iteration order.
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

    // 1. Primary: explicit render order / layer
    const orderA = renderA?.order || 0;
    const orderB = renderB?.order || 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // 2. Secondary: Y-depth sort (only when both request it)
    if (renderA?.depthSort && renderB?.depthSort) {
      const transformA = world.getComponent(a, transformType) as TransformComponent | undefined;
      const transformB = world.getComponent(b, transformType) as TransformComponent | undefined;
      const yA = transformA ? (transformA.worldY ?? transformA.y) : 0;
      const yB = transformB ? (transformB.worldY ?? transformB.y) : 0;
      if (yA !== yB) {
        return yA - yB;
      }
    }

    // 3. Tertiary: shape name (groups same drawers together, aids batching)
    const shapeA = renderA?.shape ?? "";
    const shapeB = renderB?.shape ?? "";
    if (shapeA !== shapeB) {
      return shapeA < shapeB ? -1 : 1;
    }

    // 4. Quaternary: color (further helps Canvas fillStyle/strokeStyle batching)
    const colorA = renderA?.color ?? "";
    const colorB = renderB?.color ?? "";
    if (colorA !== colorB) {
      return colorA < colorB ? -1 : 1;
    }

    // 5. Final stable tie-break by entity id (guarantees determinism)
    return a - b;
  });
}
