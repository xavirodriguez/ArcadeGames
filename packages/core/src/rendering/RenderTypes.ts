export const RenderCommandType = {
  /** Command to render a textured sprite primitive. */
  DrawSprite: "DrawSprite",
  /** Command to render a filled circle primitive. */
  DrawCircle: "DrawCircle",
  /** Command to render a line segment primitive. */
  DrawLine: "DrawLine",
  /** Command to render text string content. */
  DrawText: "DrawText"
} as const;

/**
 * Enum defining all structured render command types.
 * @public
 */
export type RenderCommandType = typeof RenderCommandType[keyof typeof RenderCommandType];

/**
 * Payload for drawing a sprite.
 * @public
 */
export interface DrawSpritePayload {
  /** Registered sprite or texture asset identifier. */
  spriteId: string;
  /** Center X coordinate in screen space. */
  x: number;
  /** Center Y coordinate in screen space. */
  y: number;
  /** Rendered sprite width in pixels. */
  width: number;
  /** Rendered sprite height in pixels. */
  height: number;
  /** Rotation angle in radians. */
  rotation: number;
}

/**
 * Payload for drawing a circle.
 * @public
 */
export interface DrawCirclePayload {
  /** Center X coordinate in screen space. */
  x: number;
  /** Center Y coordinate in screen space. */
  y: number;
  /** Circle radius in pixels. */
  radius: number;
  /** Fill color string. */
  color: string;
}

/**
 * Payload for drawing a line.
 * @public
 */
export interface DrawLinePayload {
  /** Start point X coordinate in screen space. */
  x1: number;
  /** Start point Y coordinate in screen space. */
  y1: number;
  /** End point X coordinate in screen space. */
  x2: number;
  /** End point Y coordinate in screen space. */
  y2: number;
  /** Line color string. */
  color: string;
}

/**
 * Payload for drawing text.
 * @public
 */
export interface DrawTextPayload {
  /** String text content to draw. */
  text: string;
  /** Anchor X coordinate in screen space. */
  x: number;
  /** Anchor Y coordinate in screen space. */
  y: number;
  /** Text color string. */
  color: string;
}

/**
 * Strongly typed RenderCommand representing a discriminated union.
 * Includes a fallback to allow any arbitrary string type and any payload for backward compatibility.
 * @public
 */
export type RenderCommand =
  | { type: typeof RenderCommandType.DrawSprite | "DrawSprite"; data: DrawSpritePayload }
  | { type: typeof RenderCommandType.DrawCircle | "DrawCircle"; data: DrawCirclePayload }
  | { type: typeof RenderCommandType.DrawLine | "DrawLine"; data: DrawLinePayload }
  | { type: typeof RenderCommandType.DrawText | "DrawText"; data: DrawTextPayload }
  | { type: string; data: Record<string, unknown> | unknown };

/**
 * Interface contract for render command buffer containers.
 * @public
 */
export interface RenderCommandBuffer {
  /**
   * Appends a drawing command for later execution by a renderer.
   *
   * @param command - Typed draw operation and its associated payload.
   */
  push(command: RenderCommand): void;
  /**
   * Removes all buffered drawing commands without changing the buffer instance.
   */
  clear(): void;
  /**
   * Returns the commands currently buffered, in submission order.
   *
   * @returns A read-only view of the buffered drawing commands.
   */
  getCommands(): ReadonlyArray<RenderCommand>;
}
