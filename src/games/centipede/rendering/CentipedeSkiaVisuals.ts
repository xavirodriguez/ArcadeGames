import { ShapeDrawer, EffectDrawer, World, Entity } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig } from "../types/CentipedeConfigSchema";
import { Skia, getPaint, SkCanvas } from "../../shared/rendering/SkiaContext";
import { getCentipedePalette } from "./CentipedeRenderUtils";

type CentipedeWorld = World<CentipedeComponentRegistry, CentipedeEventRegistry>;

export function renderSkiaCentipedeBackground(canvas: SkCanvas, world: CentipedeWorld): void {
  if (!Skia) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const palette = getCentipedePalette(world);

  const width = config?.worldWidth ?? 300;
  const height = config?.worldHeight ?? 320;

  const paint = getPaint();

  // Soil
  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(palette.soil));
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

  if (config?.visual?.quality !== "low") {
    const time = (world.tick * (1 / 60));
    const cx1 = width * 0.3 + Math.sin(time * 0.5) * 15;
    const cy1 = height * 0.3 + Math.cos(time * 0.4) * 15;

    paint.setColor(Skia.Color(palette.mushroomB));
    paint.setAlphaf(0.08);
    canvas.drawCircle(cx1, cy1, 70, paint);

    const cx2 = width * 0.7 + Math.cos(time * 0.35) * 20;
    const cy2 = height * 0.6 + Math.sin(time * 0.45) * 20;

    paint.setColor(Skia.Color(palette.mushroomA));
    paint.setAlphaf(0.08);
    canvas.drawCircle(cx2, cy2, 85, paint);

    const ambientEntity = world.query("AmbientParticleVisual")[0];
    if (ambientEntity !== undefined) {
      const ambientVis = world.getComponent(ambientEntity, "AmbientParticleVisual");
      if (ambientVis?.particles) {
        paint.setColor(Skia.Color(palette.amber));
        for (const p of ambientVis.particles) {
          paint.setAlphaf(p.alpha);
          canvas.drawCircle(p.x, p.y, p.radius, paint);
        }
      }
    }
  }

  // Player zone & hairline
  const zoneY = height * (27 / 32);
  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(palette.playerZone));
  canvas.drawRect(Skia.XYWHRect(0, zoneY, width, height - zoneY), paint);

  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(1);
  paint.setColor(Skia.Color(palette.hairline));
  canvas.drawLine(0, zoneY, width, zoneY, paint);

  // Death expanding rings
  const deathVisuals = world.query("SegmentDeathVisual");
  for (const dEnt of deathVisuals) {
    const vis = world.getComponent(dEnt, "SegmentDeathVisual");
    if (!vis) continue;
    if (vis.timerMs <= 120) {
      const progress = vis.timerMs / 120;
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(2 * (1 - progress));
      paint.setColor(Skia.Color(palette.centipedeBody));
      canvas.drawCircle(vis.x, vis.y, 4 + progress * 10, paint);
    }
  }
}

export const drawSkiaCentipedeBackground: EffectDrawer<SkCanvas, CentipedeComponentRegistry> = {
  draw(canvas, world) {
    renderSkiaCentipedeBackground(canvas, world as CentipedeWorld);
  }
};

export function renderSkiaCentipedeHead(canvas: SkCanvas, world: CentipedeWorld, entity: Entity): void {
  if (!Skia) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = getCentipedePalette(world);

  const vis = world.getComponent(entity, "SegmentVisual");
  const transform = world.getComponent(entity, "Transform");

  const offsetX = vis && transform ? vis.visualX - transform.x : 0;
  const offsetY = vis && transform ? vis.visualY - transform.y : 0;

  canvas.save();
  canvas.translate(offsetX, offsetY);

  const popScale = vis && vis.popTimerMs > 0 ? 1.15 : 1.0;
  const baseRadius = (config?.CELL_SIZE ?? 10) * (config?.visual?.segmentRadiusHead ?? 0.55);
  const r = baseRadius * popScale;

  const legAngle = (world.tick * 0.2);
  const legOffset = Math.sin(legAngle) * 3;

  const paint = getPaint();

  // Legs
  paint.reset();
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(1.5);
  paint.setColor(Skia.Color(palette.centipedeLegs));
  canvas.drawLine(0, -r, -2, -r - 4 + legOffset, paint);
  canvas.drawLine(0, r, -2, r + 4 - legOffset, paint);

  // Head Circle
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(palette.centipedeHead));
  canvas.drawCircle(0, 0, r, paint);

  // Shine
  paint.setColor(Skia.Color(palette.centipedeShine));
  canvas.drawCircle(-r * 0.3, -r * 0.3, r * 0.35, paint);

  // Eyes
  paint.setColor(Skia.Color(palette.hudText));
  canvas.drawCircle(r * 0.6, -r * 0.4, 1.8, paint);
  canvas.drawCircle(r * 0.6, r * 0.4, 1.8, paint);

  // Mandibles
  paint.setColor(Skia.Color(palette.amber));
  canvas.drawCircle(r * 0.85, -r * 0.2, 1.4, paint);
  canvas.drawCircle(r * 0.85, r * 0.2, 1.4, paint);

  if (isColorblind) {
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(palette.hudText));
    canvas.drawCircle(0, 0, r, paint);
  }

  canvas.restore();
}

export const drawSkiaCentipedeHead: ShapeDrawer<SkCanvas, CentipedeComponentRegistry> = {
  draw(canvas, world, entity) {
    renderSkiaCentipedeHead(canvas, world as CentipedeWorld, entity);
  }
};

export function renderSkiaCentipedeBody(canvas: SkCanvas, world: CentipedeWorld, entity: Entity): void {
  if (!Skia) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = getCentipedePalette(world);

  const vis = world.getComponent(entity, "SegmentVisual");
  const transform = world.getComponent(entity, "Transform");

  const offsetX = vis && transform ? vis.visualX - transform.x : 0;
  const offsetY = vis && transform ? vis.visualY - transform.y : 0;

  canvas.save();
  canvas.translate(offsetX, offsetY);

  const seg = world.getComponent(entity, "CentipedeSegment");
  const total = seg?.totalInChain ?? 12;
  const idx = seg?.segmentIndex ?? 1;

  const headR = (config?.CELL_SIZE ?? 10) * (config?.visual?.segmentRadiusHead ?? 0.55);
  const tailR = (config?.CELL_SIZE ?? 10) * (config?.visual?.segmentRadiusTail ?? 0.30);
  const t = total > 1 ? idx / (total - 1) : 0;
  const r = headR - t * (headR - tailR);

  const legAngle = (world.tick * 0.2) + idx * 0.5;
  const legOffset = Math.sin(legAngle) * 2.5;

  const paint = getPaint();

  // Legs
  paint.reset();
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(1.2);
  paint.setColor(Skia.Color(palette.centipedeLegs));
  canvas.drawLine(0, -r, -1.5, -r - 3 + legOffset, paint);
  canvas.drawLine(0, r, -1.5, r + 3 - legOffset, paint);

  // Body Circle
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(palette.centipedeBody));
  canvas.drawCircle(0, 0, r, paint);

  // Shine
  paint.setColor(Skia.Color(palette.centipedeShine));
  canvas.drawCircle(-r * 0.3, -r * 0.3, r * 0.35, paint);

  if (isColorblind) {
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.0);
    paint.setColor(Skia.Color(palette.hudText));
    canvas.drawCircle(0, 0, r, paint);
  }

  canvas.restore();
}

export const drawSkiaCentipedeBody: ShapeDrawer<SkCanvas, CentipedeComponentRegistry> = {
  draw(canvas, world, entity) {
    renderSkiaCentipedeBody(canvas, world as CentipedeWorld, entity);
  }
};

export function renderSkiaMushroom(canvas: SkCanvas, world: CentipedeWorld, entity: Entity): void {
  if (!Skia) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const palette = getCentipedePalette(world);

  const mushroom = world.getComponent(entity, "Mushroom");
  const vis = world.getComponent(entity, "MushroomVisual");

  const isPoisoned = mushroom?.isPoisoned ?? false;
  const hp = mushroom?.hp ?? 4;
  const hashSeed = mushroom?.hashSeed ?? 0;
  const scale = vis?.growProgress ?? 1.0;

  const baseCapColor = isPoisoned
    ? palette.toxin
    : (hashSeed % 2 === 0 ? palette.mushroomA : palette.mushroomB);

  canvas.save();
  canvas.scale(scale, scale);

  const paint = getPaint();

  if (config?.visual?.quality !== "low") {
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(baseCapColor));
    paint.setAlphaf((hp / 4) * 0.25);
    canvas.drawCircle(0, 0, 7, paint);
  }

  // Stem
  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(palette.stem));
  canvas.drawRect(Skia.XYWHRect(-1.5, 1, 3, 3.5), paint);

  // 4 Lobes
  const lobeWidth = 2.2;
  const startX = -4.4;
  const heights = [3.5, 5.5, 5.5, 3.5];

  for (let i = 0; i < 4; i++) {
    const isLit = i < hp;
    const c = isLit ? baseCapColor : palette.lobeOff;
    paint.setColor(Skia.Color(c));

    if (isLit && isPoisoned) {
      const pulse = Math.sin(world.tick * 0.1) * 0.2 + 0.8;
      paint.setAlphaf(pulse);
    } else {
      paint.setAlphaf(1.0);
    }

    const h = heights[i];
    canvas.drawRect(Skia.XYWHRect(startX + i * lobeWidth, -h / 2 - 0.5, lobeWidth - 0.4, h), paint);
  }

  // Highlight dot
  paint.setColor(Skia.Color(palette.player));
  paint.setAlphaf(0.5);
  canvas.drawCircle(-2.5, -2, 0.8, paint);

  canvas.restore();
}

export const drawSkiaMushroom: ShapeDrawer<SkCanvas, CentipedeComponentRegistry> = {
  draw(canvas, world, entity) {
    renderSkiaMushroom(canvas, world as CentipedeWorld, entity);
  }
};

export function renderSkiaSpider(canvas: SkCanvas, world: CentipedeWorld, _entity: Entity): void {
  if (!Skia) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = getCentipedePalette(world);

  const paint = getPaint();

  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(palette.amber));

  canvas.drawOval(Skia.XYWHRect(-5, -3.5, 10, 7), paint);

  const stride = Math.sin(world.tick * 0.2) * 2;
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(1.2);

  for (let i = 0; i < 4; i++) {
    const x = -3 + i * 2;
    const s = (i % 2 === 0 ? 1 : -1) * stride;
    canvas.drawLine(x, -2, x + s, -6, paint);
    canvas.drawLine(x, 2, x - s, 6, paint);
  }

  if (isColorblind) {
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(palette.hudText));
    canvas.drawOval(Skia.XYWHRect(-5, -3.5, 10, 7), paint);
  }
}

export const drawSkiaSpider: ShapeDrawer<SkCanvas, CentipedeComponentRegistry> = {
  draw(canvas, world, entity) {
    renderSkiaSpider(canvas, world as CentipedeWorld, entity);
  }
};

export function renderSkiaFlea(canvas: SkCanvas, world: CentipedeWorld, _entity: Entity): void {
  if (!Skia) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = getCentipedePalette(world);

  const paint = getPaint();

  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(palette.amber));

  const fleaPath = Skia.Path.Make();
  fleaPath.moveTo(-3.5, -2);
  fleaPath.lineTo(3.5, -2);
  fleaPath.lineTo(0, 5);
  fleaPath.close();
  canvas.drawPath(fleaPath, paint);
  canvas.drawCircle(0, -2, 3.5, paint);

  if (config?.visual?.quality !== "low") {
    paint.setAlphaf(0.3);
    canvas.drawCircle(0, -6, 2.5, paint);
    canvas.drawCircle(0, -10, 1.5, paint);
  }

  if (isColorblind) {
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(palette.hudText));
    canvas.drawPath(fleaPath, paint);
  }
}

export const drawSkiaFlea: ShapeDrawer<SkCanvas, CentipedeComponentRegistry> = {
  draw(canvas, world, entity) {
    renderSkiaFlea(canvas, world as CentipedeWorld, entity);
  }
};

export function renderSkiaScorpion(canvas: SkCanvas, world: CentipedeWorld, _entity: Entity): void {
  if (!Skia) return;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const isColorblind = config?.visual?.colorblindMode ?? false;
  const palette = getCentipedePalette(world);

  const paint = getPaint();

  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(palette.toxin));

  canvas.drawOval(Skia.XYWHRect(-6, -3, 12, 6), paint);

  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(1.5);
  const tail = Skia.Path.Make();
  tail.moveTo(-5, 0);
  tail.quadTo(-8, -4, -6, -6);
  canvas.drawPath(tail, paint);

  if (isColorblind) {
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(palette.hudText));
    canvas.drawOval(Skia.XYWHRect(-6, -3, 12, 6), paint);
  }
}

export const drawSkiaScorpion: ShapeDrawer<SkCanvas, CentipedeComponentRegistry> = {
  draw(canvas, world, entity) {
    renderSkiaScorpion(canvas, world as CentipedeWorld, entity);
  }
};

export function renderSkiaShooter(canvas: SkCanvas, world: CentipedeWorld, _entity: Entity): void {
  if (!Skia) return;

  const palette = getCentipedePalette(world);

  const paint = getPaint();

  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(palette.player));

  const shipPath = Skia.Path.Make();
  shipPath.moveTo(0, -6);
  shipPath.lineTo(5, 5);
  shipPath.lineTo(0, 2);
  shipPath.lineTo(-5, 5);
  shipPath.close();

  canvas.drawPath(shipPath, paint);

  paint.setColor(Skia.Color(palette.playerAccent));
  canvas.drawCircle(0, -1, 1.8, paint);
}

export const drawSkiaShooter: ShapeDrawer<SkCanvas, CentipedeComponentRegistry> = {
  draw(canvas, world, entity) {
    renderSkiaShooter(canvas, world as CentipedeWorld, entity);
  }
};

export function renderSkiaDart(canvas: SkCanvas, world: CentipedeWorld, _entity: Entity): void {
  if (!Skia) return;

  const palette = getCentipedePalette(world);

  const paint = getPaint();

  paint.reset();
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(3);
  paint.setColor(Skia.Color(palette.playerAccent));

  canvas.drawLine(0, -5, 0, 5, paint);
}

export const drawSkiaDart: ShapeDrawer<SkCanvas, CentipedeComponentRegistry> = {
  draw(canvas, world, entity) {
    renderSkiaDart(canvas, world as CentipedeWorld, entity);
  }
};
