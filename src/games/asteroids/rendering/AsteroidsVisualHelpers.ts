import { ShapeType, CircleShape, ColliderComponent, RenderComponent, World, Theme, THEME_RESOURCE_KEY } from "@tiny-aster/core";
import type { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";

/**
 * Resolves asteroid radius from attached Collider or Render size.
 */
export function resolveAsteroidRadius(
  render: RenderComponent | undefined,
  collider: ColliderComponent | undefined,
  defaultRadius = 25
): number {
  if (collider && collider.enabled && collider.shape.type === ShapeType.Circle) {
    return (collider.shape as CircleShape).radius;
  }
  if (render?.size) {
    return render.size / 2;
  }
  return defaultRadius;
}

export interface AsteroidSaucerSetup {
  render: RenderComponent;
  size: number;
  radius: number;
  baseColor: string;
}

export function resolveAsteroidSaucerSetup(
  render: RenderComponent | null | undefined,
  defaultColor: string
): AsteroidSaucerSetup | null {
  if (!render) return null;
  const size = render.size || 36;
  const radius = size / 2;
  const baseColor = render.color || defaultColor;
  return { render, size, radius, baseColor };
}

export interface AsteroidDrawSetup {
  render: RenderComponent;
  collider: ColliderComponent | undefined;
  radius: number;
  customGeom: any;
}

export function resolveAsteroidDrawSetup(
  world: World<AsteroidsComponentRegistry>,
  render: RenderComponent | null | undefined,
  entity: number
): AsteroidDrawSetup | null {
  if (!render) return null;
  const collider = world.getComponent(entity, "Collider");
  const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
  const customGeom = theme?.visualTheme?.shapeTokens?.enemyGeometry;
  const radius = resolveAsteroidRadius(render, collider);
  return { render, collider, radius, customGeom };
}
