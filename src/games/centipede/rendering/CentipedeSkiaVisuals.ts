import { RenderContext, resolveThemeColor, World, Entity } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig } from "../types/CentipedeConfigSchema";

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

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;

  const soil = palette?.soil ?? resolveThemeColor(world, "soil", "soil") ?? "soil";
  const playerZone = palette?.playerZone ?? resolveThemeColor(world, "playerZone", "playerZone") ?? "playerZone";
  const hairline = palette?.hairline ?? resolveThemeColor(world, "hairline", "hairline") ?? "hairline";

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};

  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(soil) : soil);
  skCanvas.drawRect({ x: 0, y: 0, width, height }, paint);

  const zoneY = height * (27 / 32);
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(playerZone) : playerZone);
  skCanvas.drawRect({ x: 0, y: zoneY, width, height: height - zoneY }, paint);

  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(hairline) : hairline);
  if (paint.setStrokeWidth) paint.setStrokeWidth(1);
  if (skCanvas.drawLine) skCanvas.drawLine(0, zoneY, width, zoneY, paint);
}

export function drawSkiaCentipedeHead(ctx: RenderContext, world: CentipedeWorld, entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawCircle) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;

  const color = palette?.centipedeHead ?? resolveThemeColor(world, "centipedeHead", "centipedeHead") ?? "centipedeHead";
  const amber = palette?.amber ?? resolveThemeColor(world, "amber", "amber") ?? "amber";

  const vis = world.getComponent(entity, "SegmentVisual");
  const transform = world.getComponent(entity, "Transform");

  const offsetX = vis && transform ? vis.visualX - transform.x : 0;
  const offsetY = vis && transform ? vis.visualY - transform.y : 0;

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};

  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(color) : color);
  skCanvas.drawCircle(offsetX, offsetY, 5.5, paint);

  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(amber) : amber);
  skCanvas.drawCircle(offsetX + 2, offsetY - 2, 1.2, paint);
  skCanvas.drawCircle(offsetX + 2, offsetY + 2, 1.2, paint);
}

export function drawSkiaCentipedeBody(ctx: RenderContext, world: CentipedeWorld, entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawCircle) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;

  const color = palette?.centipedeBody ?? resolveThemeColor(world, "centipedeBody", "centipedeBody") ?? "centipedeBody";

  const vis = world.getComponent(entity, "SegmentVisual");
  const transform = world.getComponent(entity, "Transform");

  const offsetX = vis && transform ? vis.visualX - transform.x : 0;
  const offsetY = vis && transform ? vis.visualY - transform.y : 0;

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(color) : color);

  skCanvas.drawCircle(offsetX, offsetY, 4.5, paint);
}

export function drawSkiaMushroom(ctx: RenderContext, world: CentipedeWorld, entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawRect) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;

  const mushroom = world.getComponent(entity, "Mushroom");
  const isPoisoned = mushroom?.isPoisoned ?? false;
  const hp = mushroom?.hp ?? 4;
  const hashSeed = mushroom?.hashSeed ?? 0;

  const colorA = palette?.mushroomA ?? resolveThemeColor(world, "mushroomA", "mushroomA") ?? "mushroomA";
  const colorB = palette?.mushroomB ?? resolveThemeColor(world, "mushroomB", "mushroomB") ?? "mushroomB";
  const toxin = palette?.toxin ?? resolveThemeColor(world, "toxin", "toxin") ?? "toxin";
  const lobeOff = palette?.lobeOff ?? resolveThemeColor(world, "lobeOff", "lobeOff") ?? "lobeOff";

  const baseCapColor = isPoisoned
    ? toxin
    : (hashSeed % 2 === 0 ? colorA : colorB);

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  const heights = [3.5, 5.5, 5.5, 3.5];

  for (let i = 0; i < 4; i++) {
    const isLit = i < hp;
    const c = isLit ? baseCapColor : lobeOff;
    if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(c) : c);
    const h = heights[i];
    skCanvas.drawRect({ x: -4.4 + i * 2.2, y: -h / 2, width: 1.8, height: h }, paint);
  }
}

export function drawSkiaSpider(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawOval) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;

  const amber = palette?.amber ?? resolveThemeColor(world, "amber", "amber") ?? "amber";

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(amber) : amber);

  skCanvas.drawOval({ x: -5, y: -3.5, width: 10, height: 7 }, paint);
}

export function drawSkiaFlea(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawRect) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;

  const amber = palette?.amber ?? resolveThemeColor(world, "amber", "amber") ?? "amber";

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(amber) : amber);

  skCanvas.drawRect({ x: -3, y: -4, width: 6, height: 8 }, paint);
}

export function drawSkiaScorpion(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawRect) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;

  const toxin = palette?.toxin ?? resolveThemeColor(world, "toxin", "toxin") ?? "toxin";

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(toxin) : toxin);

  skCanvas.drawRect({ x: -5, y: -2, width: 10, height: 4 }, paint);
}

export function drawSkiaShooter(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawCircle) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;

  const playerColor = palette?.player ?? resolveThemeColor(world, "centipedePlayer", "player") ?? "player";

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(playerColor) : playerColor);

  skCanvas.drawCircle(0, 0, 4, paint);
}

export function drawSkiaDart(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const skCanvas = ctx as SkiaContext;
  if (!skCanvas.drawLine) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = isColorblind ? config?.visual?.paletteColorblind : config?.visual?.palette;

  const accent = palette?.playerAccent ?? resolveThemeColor(world, "playerAccent", "playerAccent") ?? "playerAccent";

  const paint = skCanvas.createPaint ? skCanvas.createPaint() : {};
  if (paint.setColor) paint.setColor(skCanvas.parseColor ? skCanvas.parseColor(accent) : accent);
  if (paint.setStrokeWidth) paint.setStrokeWidth(3);

  skCanvas.drawLine(0, -5, 0, 5, paint);
}
