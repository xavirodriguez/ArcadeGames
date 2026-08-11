import { Renderer, TransformComponent, RenderComponent, World } from "@tiny-aster/core";

// Skia drawing functions for mobile rendering.
// They receive canvas, paint objects and render elements.
// For simplicity in React Native, we can map canvas drawings or write basic shapes.

export function drawSkiaEchoPlayer(
  _canvas: any,
  _paint: any,
  _transform: TransformComponent,
  _render: RenderComponent,
  _world: World,
  _entity: number
): void {
  // Skia drawing placeholder mapped inside initializeRenderer
}

export function drawSkiaEchoBackground(
  _canvas: any,
  _paint: any,
  _width: number,
  _height: number,
  _elapsed: number
): void {
  // Skia drawing placeholder
}
