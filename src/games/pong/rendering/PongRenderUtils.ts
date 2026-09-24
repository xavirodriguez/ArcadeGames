import { World, RenderComponent, TransformComponent, ComboComponent } from "@tiny-aster/core";
import { PongComponentRegistry, BallComponent, PaddleComponent } from "../types";
import { PongConfig } from "../types/PongConfigSchema";
import { getComboReaction } from "../../shared/rendering/CanvasNeonUtils";
import { colors } from "../../../theme/colors";

export interface PongBallContext {
  render: RenderComponent;
  transform: TransformComponent;
  ballComp: BallComponent | undefined;
  size: number;
  x: number;
  y: number;
  spin: number;
  swirlRotation: number;
  trailLength: number;
  trailColor: string;
  trailColorInner: string;
  ballColor: string;
}

export function resolvePongBallContext(
  world: World<PongComponentRegistry>,
  entity: number
): PongBallContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render || !render.visible) return null;

  const transform = world.getComponent(entity, "Transform") as TransformComponent | undefined;
  if (!transform) return null;

  const ballComp = world.getComponent(entity, "Ball") as BallComponent | undefined;
  const size = render.size ?? 8;

  const x = transform.worldX ?? transform.x;
  const y = transform.worldY ?? transform.y;

  const comboComponent = world.getSingleton("Combo") as ComboComponent | undefined;
  const multiplier = comboComponent?.multiplier ?? 1;

  const { trailLength, trailColor, trailColorInner, mainColor: ballColor } = getComboReaction(multiplier);

  const spin = ballComp ? ballComp.spinFactor : 0;
  const swirlRotation = (world.tick * spin * 0.08) % (Math.PI * 2);

  return {
    render,
    transform,
    ballComp,
    size,
    x,
    y,
    spin,
    swirlRotation,
    trailLength,
    trailColor,
    trailColorInner,
    ballColor,
  };
}

export interface PongPaddleContext {
  render: RenderComponent;
  paddle: PaddleComponent;
  w: number;
  h: number;
  isLeft: boolean;
  color: string;
  glowAlphaColor: string;
}

export function resolvePongPaddleContext(
  world: World<PongComponentRegistry>,
  entity: number
): PongPaddleContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render || !render.visible) return null;

  const paddle = world.getComponent(entity, "Paddle") as PaddleComponent | undefined;
  if (!paddle) return null;

  const config = world.getResource<PongConfig>("GameConfig") || { PADDLE_WIDTH: 15, PADDLE_HEIGHT: 80 };
  const w = config.PADDLE_WIDTH;
  const h = config.PADDLE_HEIGHT;

  const isLeft = paddle.side === "left";
  const color = isLeft ? colors.pink : colors.cyan;
  const glowAlphaColor = isLeft ? "rgba(255, 0, 85, 0.15)" : "rgba(0, 240, 255, 0.15)";

  return {
    render,
    paddle,
    w,
    h,
    isLeft,
    color,
    glowAlphaColor,
  };
}
