/**
 * Enum defining all structured render command types.
 * @public
 */
export enum RenderCommandType {
  DrawSprite = "DrawSprite",
  DrawCircle = "DrawCircle",
  DrawLine = "DrawLine",
  DrawText = "DrawText"
}

/**
 * Payload for drawing a sprite.
 * @public
 */
export interface DrawSpritePayload {
  spriteId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Payload for drawing a circle.
 * @public
 */
export interface DrawCirclePayload {
  x: number;
  y: number;
  radius: number;
  color: string;
}

/**
 * Payload for drawing a line.
 * @public
 */
export interface DrawLinePayload {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

/**
 * Payload for drawing text.
 * @public
 */
export interface DrawTextPayload {
  text: string;
  x: number;
  y: number;
  color: string;
}

/**
 * Strongly typed RenderCommand representing a discriminated union.
 * Includes a fallback to allow any arbitrary string type and any payload for backward compatibility.
 * @public
 */
export type RenderCommand =
  | { type: RenderCommandType.DrawSprite | "DrawSprite"; data: DrawSpritePayload }
  | { type: RenderCommandType.DrawCircle | "DrawCircle"; data: DrawCirclePayload }
  | { type: RenderCommandType.DrawLine | "DrawLine"; data: DrawLinePayload }
  | { type: RenderCommandType.DrawText | "DrawText"; data: DrawTextPayload }
  | { type: string; data: Record<string, unknown> | unknown };

/** @public */
export interface RenderCommandBuffer {
  push(command: RenderCommand): void;
  clear(): void;
  getCommands(): ReadonlyArray<RenderCommand>;
}
