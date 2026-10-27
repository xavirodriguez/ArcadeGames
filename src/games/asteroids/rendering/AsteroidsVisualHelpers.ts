import { ShapeType, CircleShape, ColliderComponent, RenderComponent, World, Theme, THEME_RESOURCE_KEY, EntityGeometryProfile, RandomService, hasInputAction } from "@tiny-aster/core";
import type { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { computeMotionSecondaryEffect } from "../../shared/rendering/ProceduralShapeUtils";

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
  customGeom: EntityGeometryProfile | undefined;
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

export interface PlayerShipSetup {
  render: RenderComponent;
  customGeom: EntityGeometryProfile | undefined;
  size: number;
  tick: number;
  isThrusting: boolean;
}

export function resolvePlayerShipSetup(
  world: World<AsteroidsComponentRegistry>,
  render: RenderComponent | null | undefined,
  entity: number
): PlayerShipSetup | null {
  if (!render) return null;
  const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
  const customGeom = theme?.visualTheme?.shapeTokens?.playerGeometry;
  const size = render.size || 15;
  const tick = Math.floor((world.tick * 5) / 12);
  const input = world.getComponent(entity, "Input");
  const isThrusting = hasInputAction(input?.actions, "thrust");
  return { render, customGeom, size, tick, isThrusting };
}

export function resolveCustomMotionData(
  customGeom: any,
  isThrusting: boolean,
  size: number,
  tick: number,
  renderRandom: RandomService
) {
  const motionEffect = customGeom.motionEffect || "flame";
  if (!isThrusting || motionEffect === "none") return null;
  return computeMotionSecondaryEffect(motionEffect, size, tick, renderRandom);
}
