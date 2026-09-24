import { World, RenderComponent, TransformComponent } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, BrickComponent } from "../types/ArkanoidTypes";
import { ArkanoidConfig } from "../types/ArkanoidConfigSchema";
import { colors } from "../../../theme/colors";

export interface ArkanoidBallContext {
  render: RenderComponent;
  transform: TransformComponent;
  size: number;
  color: string;
}

export function resolveArkanoidBallContext(
  world: World<ArkanoidComponentRegistry>,
  entity: number
): ArkanoidBallContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render || !render.visible) return null;

  const transform = world.getComponent(entity, "Transform") as TransformComponent | undefined;
  if (!transform) return null;

  const size = render.size ?? 8;
  const color = render.color || colors.cyan;

  return { render, transform, size, color };
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

  const config = world.getResource<ArkanoidConfig>("GameConfig") || { PADDLE_WIDTH: 100, PADDLE_HEIGHT: 16 };
  const w = config.PADDLE_WIDTH;
  const h = config.PADDLE_HEIGHT;

  const primaryColor = render.color || colors.cyan;
  const glowColor = "rgba(0, 243, 255, 0.25)";

  return { render, w, h, primaryColor, glowColor };
}

export interface ArkanoidBrickContext {
  render: RenderComponent;
  w: number;
  h: number;
  brickColor: string;
}

export function resolveBrickColor(
  render: RenderComponent,
  brick?: BrickComponent
): string {
  let brickColor: string = colors.cyan;
  if (brick) {
    if (brick.kind === "explosive") brickColor = colors.orange;
    else if (brick.kind === "regenerable") brickColor = colors.green;
    else if (brick.kind === "gravitational") brickColor = colors.purple;
  }

  if (render.hitFlashFrames && render.hitFlashFrames > 0) {
    brickColor = colors.white;
  }

  return brickColor;
}

export function resolveArkanoidBrickContext(
  world: World<ArkanoidComponentRegistry>,
  entity: number
): ArkanoidBrickContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render || !render.visible) return null;

  const brick = world.getComponent(entity, "Brick") as BrickComponent | undefined;
  const config = world.getResource<ArkanoidConfig>("GameConfig") || { BRICK_WIDTH: 70, BRICK_HEIGHT: 20 };
  const w = config.BRICK_WIDTH;
  const h = config.BRICK_HEIGHT;

  const brickColor = resolveBrickColor(render, brick);

  return { render, w, h, brickColor };
}
