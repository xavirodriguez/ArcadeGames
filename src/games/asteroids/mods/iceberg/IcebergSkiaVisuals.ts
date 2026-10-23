import type { ShapeDrawer, RenderComponent } from "@tiny-aster/core";
import { resolveHitFlash, resolveInvulnerabilityPulse, resolveAsteroidHitFlash } from "../../../shared/rendering/RenderUtils";
import {
  resolveAsteroidDrawSetup,
  resolvePlayerShipSetup
} from "../../rendering/AsteroidsVisualHelpers";
import { Skia, getPaint, type SkCanvas } from "../../../shared/rendering/SkiaContext";
import type { SkPath } from "@shopify/react-native-skia";
import { getVisibleSkiaRender } from "../../../shared/rendering/renderingUtils";
import type { AsteroidsComponentRegistry } from "../../types/AsteroidRegistry";
import {
  ICEBERG_PALETTE,
  ICEBERG_SHADOW_OFFSET,
  iceToneColor,
  hullToneColor
} from "./IcebergPalette";
import {
  ICEBREAKER_HULL_VERTS,
  ICEBREAKER_DECK_VERTS,
  scaleVerts,
  type IcebergVertex
} from "./IcebergGeometry";
import { buildFanFacets } from "./IcebergFacets";
import { vertsForAsteroidEntity } from "./IcebergDrawUtils";

const cachedIcePaths = new WeakMap<object, { hull: SkPath; deck: SkPath }>();
const cachedIcebergPaths = new WeakMap<object, { outline: SkPath; fans: Array<{ path: SkPath; tone: "light" | "mid" | "dark" }> }>();

function pathFromVerts(verts: ReadonlyArray<IcebergVertex>): SkPath {
  const path = Skia.Path.Make();
  if (verts.length === 0) return path;
  path.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    path.lineTo(verts[i].x, verts[i].y);
  }
  path.close();
  return path;
}

function drawHardShadowSkia(
  canvas: SkCanvas,
  outline: SkPath,
  opacity: number,
  scale = 1
): void {
  canvas.save();
  canvas.translate(ICEBERG_SHADOW_OFFSET.x * scale, ICEBERG_SHADOW_OFFSET.y * scale);
  const paint = getPaint();
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(ICEBERG_PALETTE.abyssShadow));
  paint.setAlphaf(opacity * 0.7);
  canvas.drawPath(outline, paint);
  canvas.restore();
}

function drawFanFacetsSkia(
  canvas: SkCanvas,
  verts: IcebergVertex[],
  colorFn: (tone: "light" | "mid" | "dark") => string,
  opacity: number
): void {
  const fans = buildFanFacets(verts);
  const paint = getPaint();
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setAlphaf(opacity);

  for (let i = 0; i < fans.length; i++) {
    const f = fans[i];
    const p = Skia.Path.Make();
    p.moveTo(f.a.x, f.a.y);
    p.lineTo(f.b.x, f.b.y);
    p.lineTo(f.c.x, f.c.y);
    p.close();
    paint.setColor(Skia.Color(colorFn(f.tone)));
    canvas.drawPath(p, paint);
  }
}

/**
 * Borealis icebreaker (Skia).
 *
 * @public
 */
export const drawSkiaIcebergPlayerShip: ShapeDrawer<
  SkCanvas,
  AsteroidsComponentRegistry
> = {
  draw(canvas, world, entity) {
    const setup = resolvePlayerShipSetup(world, getVisibleSkiaRender(world, entity), entity);
    if (!setup) return;

    const { render, size, isThrusting } = setup;
    let opacity = 1;

    canvas.save();

    const flash = resolveHitFlash(render, ICEBERG_PALETTE.shipHull, 1);
    if (flash.isFlashing) opacity = flash.opacity;
    if (world.hasComponent(entity, "Invulnerable")) {
      const inv = world.getComponent(entity, "Invulnerable");
      const invState = resolveInvulnerabilityPulse(inv?.remaining, opacity, { mode: "time" });
      if (invState.isInvulnerable) opacity = invState.opacity;
    }

    let geom = cachedIcePaths.get(render);
    if (!geom) {
      const hullVerts = scaleVerts(ICEBREAKER_HULL_VERTS, size);
      const deckVerts = scaleVerts(ICEBREAKER_DECK_VERTS, size);
      geom = {
        hull: pathFromVerts(hullVerts),
        deck: pathFromVerts(deckVerts)
      };
      cachedIcePaths.set(render, geom);
    }

    const hullVerts = scaleVerts(ICEBREAKER_HULL_VERTS, size);

    drawHardShadowSkia(canvas, geom.hull, opacity, 1);
    drawFanFacetsSkia(canvas, hullVerts, hullToneColor, opacity);

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ICEBERG_PALETTE.shipShade));
    paint.setStrokeWidth(1.25);
    paint.setAlphaf(opacity);
    canvas.drawPath(geom.hull, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(ICEBERG_PALETTE.shipDeck));
    canvas.drawPath(geom.deck, paint);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ICEBERG_PALETTE.shipShade));
    paint.setStrokeWidth(1);
    canvas.drawPath(geom.deck, paint);

    if (isThrusting) {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(ICEBERG_PALETTE.thermalBeam));
      const blocks = [
        { x: -size * 0.85, y: -size * 0.12, w: size * 0.35, h: size * 0.1, a: 0.55 },
        { x: -size * 1.05, y: -size * 0.06, w: size * 0.28, h: size * 0.08, a: 0.67 },
        { x: -size * 0.85, y: size * 0.02, w: size * 0.35, h: size * 0.1, a: 0.79 }
      ];
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        paint.setAlphaf(opacity * b.a);
        canvas.drawRect({ x: b.x, y: b.y, width: b.w, height: b.h }, paint);
      }
    }

    if (flash.isFlashing) {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(ICEBERG_PALETTE.hudText));
      paint.setStrokeWidth(2.5);
      paint.setAlphaf(opacity);
      canvas.drawPath(geom.hull, paint);
    }

    canvas.restore();
  }
};

/**
 * Faceted iceberg (Skia).
 *
 * @public
 */
export const drawSkiaIcebergAsteroid: ShapeDrawer<
  SkCanvas,
  AsteroidsComponentRegistry
> = {
  draw(canvas, world, entity) {
    const setup = resolveAsteroidDrawSetup(world, getVisibleSkiaRender(world, entity), entity);
    if (!setup) return;

    const { render, radius } = setup;
    const { opacity, isHitFlashing } = resolveAsteroidHitFlash(
      render as RenderComponent,
      ICEBERG_PALETTE.iceMid
    );

    canvas.save();

    const verts = vertsForAsteroidEntity(entity, radius);
    let cached = cachedIcebergPaths.get(render);
    if (!cached) {
      const outline = pathFromVerts(verts);
      const fans = buildFanFacets(verts).map((f) => {
        const p = Skia.Path.Make();
        p.moveTo(f.a.x, f.a.y);
        p.lineTo(f.b.x, f.b.y);
        p.lineTo(f.c.x, f.c.y);
        p.close();
        return { path: p, tone: f.tone };
      });
      cached = { outline, fans };
      cachedIcebergPaths.set(render, cached);
    }

    drawHardShadowSkia(canvas, cached.outline, opacity, Math.max(0.6, radius / 40));

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setAlphaf(opacity);
    for (let i = 0; i < cached.fans.length; i++) {
      const f = cached.fans[i];
      paint.setColor(Skia.Color(iceToneColor(f.tone)));
      canvas.drawPath(f.path, paint);
    }

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ICEBERG_PALETTE.iceDark));
    paint.setStrokeWidth(1.25);
    paint.setAlphaf(opacity);
    canvas.drawPath(cached.outline, paint);

    if (isHitFlashing) {
      paint.setColor(Skia.Color(ICEBERG_PALETTE.thermalBeam));
      paint.setStrokeWidth(2.5);
      canvas.drawPath(cached.outline, paint);
    }

    canvas.restore();
  }
};

/**
 * Thermal beam (Skia).
 *
 * @public
 */
export const drawSkiaIcebergBullet: ShapeDrawer<
  SkCanvas,
  AsteroidsComponentRegistry
> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const size = render.size || 2;
    const length = size * 5;
    const thickness = Math.max(2, size * 1.2);

    canvas.save();
    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    paint.setColor(Skia.Color(ICEBERG_PALETTE.thermalBeam));
    canvas.drawRect(
      { x: -length / 2, y: -thickness / 2, width: length, height: thickness },
      paint
    );

    paint.setColor(Skia.Color(ICEBERG_PALETTE.hudText));
    canvas.drawRect(
      { x: -length / 2, y: -thickness / 4, width: length, height: thickness / 2 },
      paint
    );

    canvas.restore();
  }
};
