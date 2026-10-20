/**
 * PHASE-2 ArkanoidRenderUtils — row palette + hitFlash / special kind precedence.
 * Precedence: hitFlash > special kind > row palette > theme default.
 */
import { World, RenderComponent, TransformComponent } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, BrickComponent } from "../types/ArkanoidTypes";
import { ArkanoidConfig } from "../types/ArkanoidConfigSchema";
import { colors } from "../../../theme/colors";
import { resolveRowColor } from "./ArkanoidPalette";

export interface ArkanoidBallContext {
  render: RenderComponent;
  transform: TransformComponent;
  size: number;
  color: string;
}

import { resolveBasicBallContext } from "../../shared/rendering/BallRenderUtils";

export function resolveArkanoidBallContext(
  world: World<ArkanoidComponentRegistry>,
  entity: number
): ArkanoidBallContext | null {
  const basic = resolveBasicBallContext(world, entity, 8);
  if (!basic) return null;

  const color = basic.render.color || colors.cyan;
  return { render: basic.render, transform: basic.transform, size: basic.size, color };
}

export interface ArkanoidPaddleContext {
  render: RenderComponent;
  w: number;
  h: number;
  primaryColor: string;
  glowColor: string;
}

export function resolveArkanoidPaddleContext(
  world: World<ArkanoidComponentRegistry>,
  entity: number
): ArkanoidPaddleContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render || !render.visible) return null;

  const config = world.getResource<ArkanoidConfig>("GameConfig") || {
    PADDLE_WIDTH: 100,
    PADDLE_HEIGHT: 16,
  };
  const w = config.PADDLE_WIDTH;
  const h = config.PADDLE_HEIGHT;

  const primaryColor = render.color || colors.cyan;
  const glowColor = colors.border;

  return { render, w, h, primaryColor, glowColor };
}

export interface ArkanoidBrickContext {
  render: RenderComponent;
  w: number;
  h: number;
  brickColor: string;
  row: number;
}

/**
 * Imp. 9 colour resolution.
 * Order: hitFlash (white) > special kind > row palette > cyan fallback.
 */
export function resolveBrickColor(
  render: RenderComponent,
  brick?: BrickComponent
): string {
  if (render.hitFlashFrames && render.hitFlashFrames > 0) {
    return colors.white;
  }

  if (brick) {
    if (brick.kind === "explosive") return colors.orange;
    if (brick.kind === "regenerable") return colors.green;
    if (brick.kind === "gravitational") return colors.purple;
    if (brick.material === "gold") return colors.gold;
    if (brick.material === "silver") return "#C0C0C0";

    if (typeof brick.row === "number") {
      return resolveRowColor(brick.row);
    }
  }

  return render.color || colors.cyan;
}

export function resolveArkanoidBrickContext(
  world: World<ArkanoidComponentRegistry>,
  entity: number
): ArkanoidBrickContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render || !render.visible) return null;

  const brick = world.getComponent(entity, "Brick") as BrickComponent | undefined;
  const config = world.getResource<ArkanoidConfig>("GameConfig") || {
    BRICK_WIDTH: 70,
    BRICK_HEIGHT: 20,
  };
  const w = config.BRICK_WIDTH;
  const h = config.BRICK_HEIGHT;

  const brickColor = resolveBrickColor(render, brick);
  const row = brick?.row ?? 0;

  return { render, w, h, brickColor, row };
}
