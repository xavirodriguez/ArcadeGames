import { ShapeDrawer, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, VisualPoseComponent, UnfoldShardComponent } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";
import { Skia, getPaint, SkCanvas } from "../../shared/rendering/SkiaContext";
import type { SkPath } from "@shopify/react-native-skia";
import {
  getGalaxianPalette,
  resolvePaperSkyVisualContext,
  resolveGalaxianEnemyVisualContext,
  resolveOrigamiBirdColors,
  OrigamiBirdColors,
  GalaxianPalette,
} from "./GalaxianVisualHelpers";
import { ORIGAMI_BIRD_POLYGONS, Polygon2D } from "./GalaxianVisualTokens";

function makePolygonPath(polygon: Polygon2D): SkPath | null {
  if (!Skia) return null;
  const path = Skia.Path.Make();
  path.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i++) {
    path.lineTo(polygon[i][0], polygon[i][1]);
  }
  path.close();
  return path;
}

export function drawSkiaPaperSky(canvas: SkCanvas, world: World<GalaxianComponentRegistry>): void {
  if (!Skia) return;

  const skyContext = resolvePaperSkyVisualContext(world);
  if (!skyContext) return;

  const { w, h, palette, stars, layers } = skyContext;
  const paint = getPaint();

  // 1. Base night sky
  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(palette.paperNight));
  canvas.drawRect(Skia.XYWHRect(0, 0, w, h), paint);

  // 2. Stars
  paint.setColor(Skia.Color(palette.star));
  for (const star of stars) {
    if (star.isDiamond) {
      const diamond = Skia.Path.Make();
      diamond.moveTo(star.x, star.y - 3);
      diamond.lineTo(star.x + 1.5, star.y);
      diamond.lineTo(star.x, star.y + 3);
      diamond.lineTo(star.x - 1.5, star.y);
      diamond.close();
      canvas.drawPath(diamond, paint);
    } else {
      canvas.drawRect(Skia.XYWHRect(star.x, star.y, 1.5, 1.5), paint);
    }
  }

  // 3. Strata layers
  for (const layer of layers) {
    canvas.save();

    // Shadow
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.strataShadow));
    canvas.drawOval(Skia.XYWHRect(w / 2 - w * 0.7 + 4, layer.cy - h * layer.scaleY + 6, w * 1.4, h * layer.scaleY * 2), paint);

    // Main layer
    paint.setColor(Skia.Color(layer.color));
    canvas.drawOval(Skia.XYWHRect(w / 2 - w * 0.7, layer.cy - h * layer.scaleY, w * 1.4, h * layer.scaleY * 2), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1);
    paint.setColor(Skia.Color(layer.edge));
    canvas.drawOval(Skia.XYWHRect(w / 2 - w * 0.7, layer.cy - h * layer.scaleY, w * 1.4, h * layer.scaleY * 2), paint);

    canvas.restore();
  }
}

export const drawSkiaPaperSkyEffect = {
  draw(canvas: SkCanvas, world: World<GalaxianComponentRegistry>) {
    drawSkiaPaperSky(canvas, world);
  },
};

export const drawSkiaGalaxianPlayer: ShapeDrawer<SkCanvas, GalaxianComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    const transform = world.getComponent(entity, "Transform");
    const pose = world.getComponent(entity, "VisualPose") as VisualPoseComponent | undefined;
    const palette = getGalaxianPalette(world);

    if (!render || !palette) return;

    const invulnerability = world.getComponent(entity, "Invulnerable");
    if (invulnerability && invulnerability.remaining > 0 && Math.floor(world.tick / 5) % 2 === 0) return;

    canvas.save();
    if (pose && transform) {
      canvas.rotate(((pose.rotation - transform.rotation) * 180) / Math.PI, 0, 0);
    }

    const paint = getPaint();

    // Left Wing
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.player));
    const lw = Skia.Path.Make();
    lw.moveTo(0, -16);
    lw.lineTo(-14, 10);
    lw.lineTo(0, 4);
    lw.close();
    canvas.drawPath(lw, paint);

    // Right Wing
    paint.setColor(Skia.Color(palette.playerShade));
    const rw = Skia.Path.Make();
    rw.moveTo(0, -16);
    rw.lineTo(14, 10);
    rw.lineTo(0, 4);
    rw.close();
    canvas.drawPath(rw, paint);

    // Tail
    paint.setColor(Skia.Color(palette.playerFold));
    const tail = Skia.Path.Make();
    tail.moveTo(0, 4);
    tail.lineTo(-5, 13);
    tail.lineTo(0, 10);
    tail.lineTo(5, 13);
    tail.close();
    canvas.drawPath(tail, paint);

    // Crease line
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1);
    canvas.drawLine(0, -16, 0, 4, paint);

    // Engine glow
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.playerAccent));
    canvas.drawCircle(0, 12, 3, paint);

    canvas.restore();
  },
};

export function drawSkiaOrigamiBird(
  canvas: SkCanvas,
  enemyType: "flagship" | "escort" | "emissary" | "drone",
  palette: GalaxianPalette,
  scale: number = 1.0,
  isDamaged: boolean = false
): void {
  if (!Skia) return;
  const paint = getPaint();
  const colors: OrigamiBirdColors = resolveOrigamiBirdColors(enemyType, palette, isDamaged);

  canvas.save();
  canvas.scale(scale, scale);

  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);

  // Left body
  paint.setColor(Skia.Color(colors.light));
  const lb = makePolygonPath(ORIGAMI_BIRD_POLYGONS.leftBody);
  if (lb) canvas.drawPath(lb, paint);

  // Right body
  paint.setColor(Skia.Color(colors.mid));
  const rb = makePolygonPath(ORIGAMI_BIRD_POLYGONS.rightBody);
  if (rb) canvas.drawPath(rb, paint);

  // Left wing top
  paint.setColor(Skia.Color(colors.light));
  const lwt = makePolygonPath(ORIGAMI_BIRD_POLYGONS.leftWingTop);
  if (lwt) canvas.drawPath(lwt, paint);

  // Left wing bottom
  paint.setColor(Skia.Color(colors.mid));
  const lwb = makePolygonPath(ORIGAMI_BIRD_POLYGONS.leftWingBottom);
  if (lwb) canvas.drawPath(lwb, paint);

  // Right wing top
  paint.setColor(Skia.Color(colors.mid));
  const rwt = makePolygonPath(ORIGAMI_BIRD_POLYGONS.rightWingTop);
  if (rwt) canvas.drawPath(rwt, paint);

  // Right wing bottom
  paint.setColor(Skia.Color(colors.dark));
  const rwb = makePolygonPath(ORIGAMI_BIRD_POLYGONS.rightWingBottom);
  if (rwb) canvas.drawPath(rwb, paint);

  if (enemyType === "emissary") {
    paint.setColor(Skia.Color(colors.mid));
    const hookL = makePolygonPath(ORIGAMI_BIRD_POLYGONS.emissaryHookLeft);
    if (hookL) canvas.drawPath(hookL, paint);

    paint.setColor(Skia.Color(colors.dark));
    const hookR = makePolygonPath(ORIGAMI_BIRD_POLYGONS.emissaryHookRight);
    if (hookR) canvas.drawPath(hookR, paint);
  } else if (enemyType === "escort") {
    paint.setColor(Skia.Color(colors.light));
    const hornL = makePolygonPath(ORIGAMI_BIRD_POLYGONS.escortHornLeft);
    if (hornL) canvas.drawPath(hornL, paint);

    paint.setColor(Skia.Color(colors.dark));
    const hornR = makePolygonPath(ORIGAMI_BIRD_POLYGONS.escortHornRight);
    if (hornR) canvas.drawPath(hornR, paint);
  } else if (enemyType === "flagship") {
    paint.setColor(Skia.Color(colors.light));
    const crest = makePolygonPath(ORIGAMI_BIRD_POLYGONS.flagshipCrest);
    if (crest) canvas.drawPath(crest, paint);
  }

  // Head
  paint.setColor(Skia.Color(colors.dark));
  const head = makePolygonPath(ORIGAMI_BIRD_POLYGONS.head);
  if (head) canvas.drawPath(head, paint);

  // Eye
  paint.setColor(Skia.Color(palette.eye));
  canvas.drawCircle(0, 3, 1.5, paint);

  canvas.restore();
}

export const drawSkiaGalaxianEnemy: ShapeDrawer<SkCanvas, GalaxianComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const enemyCtx = resolveGalaxianEnemyVisualContext(world, entity);
    if (!enemyCtx) return;

    const { palette, enemy, deltaRotation, scaleX, scaleY, baseScale, isDamaged, trailPoints, showWindupReticle } = enemyCtx;
    const paint = getPaint();

    if (trailPoints) {
      canvas.save();
      const path = Skia.Path.Make();
      path.moveTo(trailPoints[0].x, trailPoints[0].y);
      for (let i = 1; i < trailPoints.length; i++) {
        path.lineTo(trailPoints[i].x, trailPoints[i].y);
      }

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(4);
      paint.setColor(Skia.Color(palette.trail));
      paint.setAlphaf(0.35);
      canvas.drawPath(path, paint);

      paint.setStrokeWidth(1.5);
      paint.setAlphaf(0.75);
      canvas.drawPath(path, paint);

      canvas.restore();
    }

    if (showWindupReticle) {
      canvas.save();
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(2);
      paint.setColor(Skia.Color(palette.trail));
      canvas.drawCircle(0, 0, 16, paint);
      canvas.restore();
    }

    canvas.save();
    if (deltaRotation !== 0) {
      canvas.rotate((deltaRotation * 180) / Math.PI, 0, 0);
    }
    if (scaleX !== 1.0 || scaleY !== 1.0) {
      canvas.scale(scaleX, scaleY);
    }

    drawSkiaOrigamiBird(canvas, enemy.enemyType, palette, baseScale, isDamaged);

    canvas.restore();
  },
};

export const drawSkiaGalaxianPlayerBullet: ShapeDrawer<SkCanvas, GalaxianComponentRegistry> = {
  draw(canvas, world, _entity) {
    if (!Skia) return;
    const palette = getGalaxianPalette(world);
    const color = palette?.playerAccent ?? "#5CF2C0";
    const paint = getPaint();

    canvas.save();
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(color));
    canvas.drawCircle(0, 0, 3, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2);
    canvas.drawLine(0, 0, 0, 8, paint);

    canvas.restore();
  },
};

export const drawSkiaGalaxianEnemyBullet: ShapeDrawer<SkCanvas, GalaxianComponentRegistry> = {
  draw(canvas, world, _entity) {
    if (!Skia) return;
    const palette = getGalaxianPalette(world);

    const fireColor = palette?.enemyFire ?? "#FF7A45";
    const coreColor = palette?.enemyFireCore ?? "#FFF6E5";
    const paint = getPaint();

    canvas.save();

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(fireColor));

    const outer = Skia.Path.Make();
    outer.moveTo(0, -8);
    outer.lineTo(4, 0);
    outer.lineTo(0, 8);
    outer.lineTo(-4, 0);
    outer.close();
    canvas.drawPath(outer, paint);

    paint.setColor(Skia.Color(coreColor));
    const inner = Skia.Path.Make();
    inner.moveTo(0, -4);
    inner.lineTo(2, 0);
    inner.lineTo(0, 4);
    inner.lineTo(-2, 0);
    inner.close();
    canvas.drawPath(inner, paint);

    canvas.restore();
  },
};

export const drawSkiaUnfoldShard: ShapeDrawer<SkCanvas, GalaxianComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const shard = world.getComponent(entity, "UnfoldShard") as UnfoldShardComponent | undefined;
    if (!shard) return;

    canvas.save();
    const paint = getPaint();
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(shard.color));
    paint.setAlphaf(Math.max(0, shard.life / shard.maxLife));

    const path = Skia.Path.Make();
    path.moveTo(0, -shard.size);
    path.lineTo(shard.size / 2, shard.size / 2);
    path.lineTo(-shard.size / 2, shard.size / 2);
    path.close();

    canvas.drawPath(path, paint);
    canvas.restore();
  },
};

export const drawSkiaScorePopup: ShapeDrawer<SkCanvas, GalaxianComponentRegistry> = {
  draw(_canvas, _world, _entity) {
    // Skia text rendering handled via React Native Skia Text element or custom adapter
  },
};
