import { RenderContext, World, Entity } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { getCentipedePalette } from "./CentipedeRenderUtils";

type CentipedeWorld = World<CentipedeComponentRegistry, CentipedeEventRegistry>;

interface SkiaContext {
  canvas?: { width?: number; height?: number };
  drawRect?: (rect: { x: number; y: number; width: number; height: number }, paint: unknown) => void;
  drawCircle?: (cx: number, cy: number, r: number, paint: unknown) => void;
  drawOval?: (rect: { x: number; y: number; width: number; height: number }, paint: unknown) => void;
  drawLine?: (x1: number, y1: number, x2: number, y2: number, paint: unknown) => void;
  createPaint?: () => { setColor?: (c: unknown) => void; setStrokeWidth?: (w: number) => void };
  parseColor?: (colorStr: string) => unknown;
}

export function drawSkiaCentipedeBackground(ctx: RenderContext, world: CentipedeWorld): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawRect) return;

  const canvas = skCanvas.canvas;
  const width = canvas?.width ?? 300;
  const height = canvas?.height ?? 320;

  const palette = getCentipedePalette(world);

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};

  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(palette.soil) : palette.soil);
  skCanvas.drawRect({ x: 0, y: 0, width, height }, paint);

  const zoneY = height * (27 / 32);
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(palette.playerZone) : palette.playerZone);
  skCanvas.drawRect({ x: 0, y: zoneY, width, height: height - zoneY }, paint);

  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(palette.hairline) : palette.hairline);
  if (paint.setStrokeWidth) paint.setStrokeWidth(1);
  if (skCanvas.drawLine) skCanvas.drawLine(0, zoneY, width, zoneY, paint);
}

export function drawSkiaCentipedeHead(ctx: RenderContext, world: CentipedeWorld, entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawCircle) return;

  const palette = getCentipedePalette(world);

  const vis = world.getComponent(entity, "SegmentVisual");
  const transform = world.getComponent(entity, "Transform");

  const offsetX = vis && transform ? vis.visualX - transform.x : 0;
  const offsetY = vis && transform ? vis.visualY - transform.y : 0;

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};

  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(palette.centipedeHead) : palette.centipedeHead);
  skCanvas.drawCircle(offsetX, offsetY, 5.5, paint);

  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(palette.amber) : palette.amber);
  skCanvas.drawCircle(offsetX + 2, offsetY - 2, 1.2, paint);
  skCanvas.drawCircle(offsetX + 2, offsetY + 2, 1.2, paint);
}

export function drawSkiaCentipedeBody(ctx: RenderContext, world: CentipedeWorld, entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawCircle) return;

  const palette = getCentipedePalette(world);

  const vis = world.getComponent(entity, "SegmentVisual");
  const transform = world.getComponent(entity, "Transform");

  const offsetX = vis && transform ? vis.visualX - transform.x : 0;
  const offsetY = vis && transform ? vis.visualY - transform.y : 0;

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(palette.centipedeBody) : palette.centipedeBody);

  skCanvas.drawCircle(offsetX, offsetY, 4.5, paint);
}

export function drawSkiaMushroom(ctx: RenderContext, world: CentipedeWorld, entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawRect) return;

  const palette = getCentipedePalette(world);

  const mushroom = world.getComponent(entity, "Mushroom");
  const isPoisoned = mushroom?.isPoisoned ?? false;
  const hp = mushroom?.hp ?? 4;
  const hashSeed = mushroom?.hashSeed ?? 0;

  const baseCapColor = isPoisoned
    ? palette.toxin
    : (hashSeed % 2 === 0 ? palette.mushroomA : palette.mushroomB);

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  const heights = [3.5, 5.5, 5.5, 3.5];

  for (let i = 0; i < 4; i++) {
    const isLit = i < hp;
    const c = isLit ? baseCapColor : palette.lobeOff;
    if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(c) : c);
    const h = heights[i];
    skCanvas.drawRect({ x: -4.4 + i * 2.2, y: -h / 2, width: 1.8, height: h }, paint);
  }
}

export function drawSkiaSpider(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawOval) return;

  const palette = getCentipedePalette(world);

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(palette.amber) : palette.amber);

  skCanvas.drawOval({ x: -5, y: -3.5, width: 10, height: 7 }, paint);
}

export function drawSkiaFlea(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawRect) return;

  const palette = getCentipedePalette(world);

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(palette.amber) : palette.amber);

  skCanvas.drawRect({ x: -3, y: -4, width: 6, height: 8 }, paint);
}

export function drawSkiaScorpion(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawRect) return;

  const palette = getCentipedePalette(world);

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(palette.toxin) : palette.toxin);

  skCanvas.drawRect({ x: -5, y: -2, width: 10, height: 4 }, paint);
}

export function drawSkiaShooter(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawCircle) return;

  const palette = getCentipedePalette(world);

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(palette.player) : palette.player);

  skCanvas.drawCircle(0, 0, 4, paint);
}

export function drawSkiaDart(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawLine) return;

  const palette = getCentipedePalette(world);

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(palette.playerAccent) : palette.playerAccent);
  if (paint.setStrokeWidth) paint.setStrokeWidth(3);

  skCanvas.drawLine(0, -5, 0, 5, paint);
}
