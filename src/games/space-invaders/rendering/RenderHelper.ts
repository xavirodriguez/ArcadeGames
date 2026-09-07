import { World, Entity, RenderComponent } from "@tiny-aster/core";
import { colors } from "../../../theme/colors";
import { Skia } from "../../shared/rendering/SkiaContext";

/**
 * Safely extracts the RenderComponent for an entity if React Native Skia is available.
 */
export function safeGetRenderComponent(
  world: World,
  entity: Entity
): RenderComponent | null {
  if (!Skia) return null;
  return (world.getComponent(entity, "Render") as RenderComponent | undefined) ?? null;
}

/**
 * Calculates hit flash presentation properties (color, opacity, size) given drawer defaults.
 */
export function getRenderFlash(
  render: RenderComponent,
  defaultColor: string,
  defaultSize: number
): { color: string; opacity: number; size: number } {
  let colorStr = render.color || defaultColor;
  let opacity = render.opacity ?? 1.0;
  if (render.hitFlashFrames && render.hitFlashFrames > 0) {
    if ((render.hitFlashFrames >> 1) % 2 === 0) opacity = 0.3;
    colorStr = colors.white;
  }
  return { color: colorStr, opacity, size: render.size || defaultSize };
}
