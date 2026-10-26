import { ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianEnemyComponent, VisualPoseComponent, DiveTrailComponent, UnfoldShardComponent, ScorePopupComponent } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";
import { Skia, getPaint, SkCanvas } from "../../shared/rendering/SkiaContext";

export function drawSkiaPaperSky(canvas: SkCanvas, world: World<GalaxianComponentRegistry>): void {
  if (!Skia) return;

  const config = world.getResource<GalaxianConfig>("GameConfig");
  const palette = config?.visual.colorblindMode
    ? config.visual.paletteColorblind
    : config?.visual.palette;

  if (!palette) return;

  const w = config?.worldWidth ?? 480;
  const h = config?.worldHeight ?? 640;
  const time = (world.tick * (1 / 60));
  const paint = getPaint();

  // 1. Base night sky
  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(palette.paperNight));
  canvas.drawRect(Skia.XYWHRect(0, 0, w, h), paint);

  // 2. Stars
  paint.setColor(Skia.Color(palette.star));
  const starCount = config?.visual.quality === "low" ? 25 : 55;
  for (let i = 0; i < starCount; i++) {
    const speed = 15 + (i % 3) * 20;
    const sx = (i * 73 + (i % 5) * 17) % w;
    const sy = ((i * 41 + time * speed) % h);

    if (i % 4 === 0) {
      const diamond = Skia.Path.Make();
      diamond.moveTo(sx, sy - 3);
      diamond.lineTo(sx + 1.5, sy);
      diamond.lineTo(sx, sy + 3);
      diamond.lineTo(sx - 1.5, sy);
      diamond.close();
      canvas.drawPath(diamond, paint);
    } else {
      canvas.drawRect(Skia.XYWHRect(sx, sy, 1.5, 1.5), paint);
    }
  }

  // 3. Strata layers
  const isLowQuality = config?.visual.quality === "low";
  const layers = isLowQuality
    ? [{ color: palette.strataMid, edge: palette.strataEdge, speed: 8, scaleY: 0.35, offsetY: 120 }]
    : [
        { color: palette.strataFar, edge: palette.strataEdge, speed: 5, scaleY: 0.25, offsetY: 80 },
        { color: palette.strataMid, edge: palette.strataEdge, speed: 10, scaleY: 0.35, offsetY: 220 },
        { color: palette.strataNear, edge: palette.strataEdge, speed: 18, scaleY: 0.45, offsetY: 400 },
      ];

  for (const layer of layers) {
    const scrollY = (time * layer.speed) % (h * 1.5);
    const cy = (layer.offsetY + scrollY) % (h * 1.5) - h * 0.25;

    canvas.save();

    // Shadow
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.strataShadow));
    canvas.drawOval(Skia.XYWHRect(w / 2 - w * 0.7 + 4, cy - h * layer.scaleY + 6, w * 1.4, h * layer.scaleY * 2), paint);

    // Main layer
    paint.setColor(Skia.Color(layer.color));
    canvas.drawOval(Skia.XYWHRect(w / 2 - w * 0.7, cy - h * layer.scaleY, w * 1.4, h * layer.scaleY * 2), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1);
    paint.setColor(Skia.Color(layer.edge));
    canvas.drawOval(Skia.XYWHRect(w / 2 - w * 0.7, cy - h * layer.scaleY, w * 1.4, h * layer.scaleY * 2), paint);

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
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const palette = config?.visual.colorblindMode
      ? config.visual.paletteColorblind
      : config?.visual.palette;

    if (!render || !palette) return;

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
  palette: any,
  scale: number = 1.0,
  isDamaged: boolean = false
): void {
  if (!Skia) return;
  const paint = getPaint();

  let light = palette.droneLight;
  let mid = palette.droneMid;
  let dark = palette.droneDark;

  if (enemyType === "emissary") {
    light = palette.emissaryLight;
    mid = palette.emissaryMid;
    dark = palette.emissaryDark;
  } else if (enemyType === "escort") {
    light = palette.escortLight;
    mid = palette.escortMid;
    dark = palette.escortDark;
  } else if (enemyType === "flagship") {
    light = isDamaged ? palette.escortLight : palette.flagshipLight;
    mid = isDamaged ? palette.escortMid : palette.flagshipMid;
    dark = isDamaged ? palette.escortDark : palette.flagshipDark;
  }

  canvas.save();
  canvas.scale(scale, scale);

  paint.reset();
  paint.setStyle(Skia.PaintStyle.Fill);

  // Left body
  paint.setColor(Skia.Color(light));
  const lb = Skia.Path.Make();
  lb.moveTo(0, -8);
  lb.lineTo(0, 10);
  lb.lineTo(-4.5, 0);
  lb.close();
  canvas.drawPath(lb, paint);

  // Right body
  paint.setColor(Skia.Color(mid));
  const rb = Skia.Path.Make();
  rb.moveTo(0, -8);
  rb.lineTo(4.5, 0);
  rb.lineTo(0, 10);
  rb.close();
  canvas.drawPath(rb, paint);

  // Left wing top
  paint.setColor(Skia.Color(light));
  const lwt = Skia.Path.Make();
  lwt.moveTo(-4, -2);
  lwt.lineTo(-15, -10);
  lwt.lineTo(-13, 2);
  lwt.close();
  canvas.drawPath(lwt, paint);

  // Left wing bottom
  paint.setColor(Skia.Color(mid));
  const lwb = Skia.Path.Make();
  lwb.moveTo(-4, -2);
  lwb.lineTo(-13, 2);
  lwb.lineTo(-4, 6);
  lwb.close();
  canvas.drawPath(lwb, paint);

  // Right wing top
  paint.setColor(Skia.Color(mid));
  const rwt = Skia.Path.Make();
  rwt.moveTo(4, -2);
  rwt.lineTo(15, -10);
  rwt.lineTo(13, 2);
  rwt.close();
  canvas.drawPath(rwt, paint);

  // Right wing bottom
  paint.setColor(Skia.Color(dark));
  const rwb = Skia.Path.Make();
  rwb.moveTo(4, -2);
  rwb.lineTo(13, 2);
  rwb.lineTo(4, 6);
  rwb.close();
  canvas.drawPath(rwb, paint);

  if (enemyType === "emissary") {
    paint.setColor(Skia.Color(mid));
    const hookL = Skia.Path.Make();
    hookL.moveTo(-15, -10);
    hookL.lineTo(-19, -4);
    hookL.lineTo(-13, 2);
    hookL.close();
    canvas.drawPath(hookL, paint);

    paint.setColor(Skia.Color(dark));
    const hookR = Skia.Path.Make();
    hookR.moveTo(15, -10);
    hookR.lineTo(19, -4);
    hookR.lineTo(13, 2);
    hookR.close();
    canvas.drawPath(hookR, paint);
  } else if (enemyType === "escort") {
    paint.setColor(Skia.Color(light));
    const hornL = Skia.Path.Make();
    hornL.moveTo(-2, 6);
    hornL.lineTo(-6, 12);
    hornL.lineTo(-1, 8);
    hornL.close();
    canvas.drawPath(hornL, paint);

    paint.setColor(Skia.Color(dark));
    const hornR = Skia.Path.Make();
    hornR.moveTo(2, 6);
    hornR.lineTo(6, 12);
    hornR.lineTo(1, 8);
    hornR.close();
    canvas.drawPath(hornR, paint);
  } else if (enemyType === "flagship") {
    paint.setColor(Skia.Color(light));
    const crest = Skia.Path.Make();
    crest.moveTo(0, -8);
    crest.lineTo(3, -13);
    crest.lineTo(0, -18);
    crest.lineTo(-3, -13);
    crest.close();
    canvas.drawPath(crest, paint);
  }

  // Head
  paint.setColor(Skia.Color(dark));
  const head = Skia.Path.Make();
  head.moveTo(0, 10);
  head.lineTo(-2.6, 5);
  head.lineTo(2.6, 5);
  head.close();
  canvas.drawPath(head, paint);

  // Eye
  paint.setColor(Skia.Color(palette.eye));
  canvas.drawCircle(0, 3, 1.5, paint);

  canvas.restore();
}

export const drawSkiaGalaxianEnemy: ShapeDrawer<SkCanvas, GalaxianComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const enemy = world.getComponent(entity, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
    const transform = world.getComponent(entity, "Transform");
    const pose = world.getComponent(entity, "VisualPose") as VisualPoseComponent | undefined;
    const trail = world.getComponent(entity, "DiveTrail") as DiveTrailComponent | undefined;
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const palette = config?.visual.colorblindMode
      ? config.visual.paletteColorblind
      : config?.visual.palette;

    if (!enemy || !palette) return;

    const paint = getPaint();

    if (trail && trail.history.length > 1 && (enemy.state === "diving" || enemy.state === "windup") && transform) {
      canvas.save();
      canvas.translate(-transform.x, -transform.y);
      const pts = trail.history;
      const path = Skia.Path.Make();
      path.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        path.lineTo(pts[i].x, pts[i].y);
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

    if (enemy.state === "windup") {
      canvas.save();
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(2);
      paint.setColor(Skia.Color(palette.trail));
      canvas.drawCircle(0, 0, 16, paint);
      canvas.restore();
    }

    canvas.save();
    if (pose && transform) {
      canvas.rotate(((pose.rotation - transform.rotation) * 180) / Math.PI, 0, 0);
      canvas.scale(pose.scaleX, pose.scaleY);
    }

    const baseScale = enemy.enemyType === "flagship" ? 1.25 : 1.0;
    const isDamaged = enemy.enemyType === "flagship" && enemy.hitsRemaining === 1;
    drawSkiaOrigamiBird(canvas, enemy.enemyType, palette, baseScale, isDamaged);

    canvas.restore();
  },
};

export const drawSkiaGalaxianPlayerBullet: ShapeDrawer<SkCanvas, GalaxianComponentRegistry> = {
  draw(canvas, world, _entity) {
    if (!Skia) return;
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const palette = config?.visual.colorblindMode
      ? config.visual.paletteColorblind
      : config?.visual.palette;
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
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const palette = config?.visual.colorblindMode
      ? config.visual.paletteColorblind
      : config?.visual.palette;

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
