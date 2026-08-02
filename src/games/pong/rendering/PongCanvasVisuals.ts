import { World, TransformComponent } from "@tiny-aster/core";
import { BallComponent } from "../types";

/**
 * Función especializada para renderizar el estado de la bola con su efecto de giro.
 */
export function drawPongBall(
  ctx: CanvasRenderingContext2D,
  world: World<any>,
  entity: number
): void {
  const transform = world.getComponent(entity, "Transform") as TransformComponent;
  if (!transform) return;

  const ballComp = world.getComponent(entity, "Ball" as any) as BallComponent;
  const size = ballComp ? 8 : 8; // fallback size

  ctx.save();
  ctx.translate(transform.x, transform.y);

  // Efecto visual de estela o rotación según spinFactor
  const spin = ballComp ? ballComp.spinFactor : 0;
  ctx.rotate(spin * Math.PI);

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();

  // Línea interior para visualizar la rotación
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.stroke();

  ctx.restore();
}
