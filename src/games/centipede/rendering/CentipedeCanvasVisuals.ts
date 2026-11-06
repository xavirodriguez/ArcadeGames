import { RenderContext, World, Entity, ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig } from "../types/CentipedeConfigSchema";
import {
  CentipedeWorld,
  getCentipedePalette,
  getCentipedeHeadVisualContext,
  getCentipedeBodyVisualContext,
  getMushroomVisualContext
} from "./CentipedeVisualHelpers";

export function renderCentipedeBackground(ctx: RenderContext, world: CentipedeWorld): void {
  const c2d = ctx as CanvasRenderingContext2D;
  const canvas = (ctx as { canvas?: HTMLCanvasElement }).canvas;
  const width = canvas?.width ?? 300;
  const height = canvas?.height ?? 320;

  const config = world.getResource<CentipedeConfig>("GameConfig");
  const palette = getCentipedePalette(world);

  c2d.fillStyle = palette.soil;
  c2d.fillRect(0, 0, width, height);

  if (config?.visual?.quality !== "low") {
    const time = Date.now() * 0.0005;
    const cx1 = width * 0.3 + Math.sin(time) * 15;
    const cy1 = height * 0.3 + Math.cos(time * 0.8) * 15;

    c2d.globalAlpha = 0.08;
    c2d.fillStyle = palette.mushroomB;
    c2d.beginPath();
    c2d.arc(cx1, cy1, 70, 0, Math.PI * 2);
    c2d.fill();

    const cx2 = width * 0.7 + Math.cos(time * 0.7) * 20;
    const cy2 = height * 0.6 + Math.sin(time * 0.9) * 20;

    c2d.fillStyle = palette.mushroomA;
    c2d.beginPath();
    c2d.arc(cx2, cy2, 85, 0, Math.PI * 2);
    c2d.fill();

    const ambientEntity = world.query("AmbientParticleVisual")[0];
    if (ambientEntity !== undefined) {
      const ambientVis = world.getComponent(ambientEntity, "AmbientParticleVisual");
      if (ambientVis?.particles) {
        c2d.fillStyle = palette.amber;
        for (const p of ambientVis.particles) {
          c2d.globalAlpha = p.alpha;
          c2d.beginPath();
          c2d.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          c2d.fill();
        }
      }
    }
    c2d.globalAlpha = 1.0;
  }

  const zoneY = height * (27 / 32);
  c2d.fillStyle = palette.playerZone;
  c2d.fillRect(0, zoneY, width, height - zoneY);

  c2d.strokeStyle = palette.hairline;
  c2d.lineWidth = 1;
  c2d.beginPath();
  c2d.moveTo(0, zoneY);
  c2d.lineTo(width, zoneY);
  c2d.stroke();

  // Draw death expanding rings
  const deathVisuals = world.query("SegmentDeathVisual");
  for (const dEnt of deathVisuals) {
    const vis = world.getComponent(dEnt, "SegmentDeathVisual");
    if (!vis) continue;
    if (vis.timerMs <= 120) {
      const progress = vis.timerMs / 120;
      c2d.save();
      c2d.strokeStyle = palette.centipedeBody;
      c2d.lineWidth = 2 * (1 - progress);
      c2d.beginPath();
      c2d.arc(vis.x, vis.y, 4 + progress * 10, 0, Math.PI * 2);
      c2d.stroke();
      c2d.restore();
    }
  }

  // Draw floating score popups
  const scoreVisuals = world.query("FloatingScoreVisual");
  for (const sEnt of scoreVisuals) {
    const sVis = world.getComponent(sEnt, "FloatingScoreVisual");
    if (!sVis) continue;
    const progress = Math.min(1.0, sVis.timerMs / sVis.maxTimerMs);
    c2d.save();
    c2d.font = "bold 10px system-ui";
    c2d.fillStyle = palette.amber;
    c2d.globalAlpha = 1 - progress;
    c2d.textAlign = "center";
    c2d.fillText(sVis.text, sVis.x, sVis.y + sVis.offsetY);
    c2d.restore();
  }
}

export const drawCentipedeBackground: EffectDrawer<CanvasRenderingContext2D, CentipedeComponentRegistry> = {
  draw(ctx, world) {
    renderCentipedeBackground(ctx, world as CentipedeWorld);
  }
};

export function renderCentipedeHead(ctx: RenderContext, world: CentipedeWorld, entity: Entity): void {
  const c2d = ctx as CanvasRenderingContext2D;
  const { palette, offsetX, offsetY, radius: r } = getCentipedeHeadVisualContext(world, entity);

  c2d.save();
  if (offsetX !== 0 || offsetY !== 0) {
    c2d.translate(offsetX, offsetY);
  }

  const legAngle = Date.now() * 0.015;
  const legOffset = Math.sin(legAngle) * 3;

  c2d.strokeStyle = palette.centipedeLegs;
  c2d.lineWidth = 1.5;
  c2d.lineCap = "round";

  c2d.beginPath();
  c2d.moveTo(0, -r);
  c2d.lineTo(-2, -r - 4 + legOffset);
  c2d.moveTo(0, r);
  c2d.lineTo(-2, r + 4 - legOffset);
  c2d.stroke();

  c2d.fillStyle = palette.centipedeHead;
  c2d.beginPath();
  c2d.arc(0, 0, r, 0, Math.PI * 2);
  c2d.fill();

  c2d.fillStyle = palette.centipedeShine;
  c2d.beginPath();
  c2d.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, Math.PI * 2);
  c2d.fill();

  c2d.fillStyle = "#FFE9D6";
  c2d.beginPath();
  c2d.arc(r * 0.6, -r * 0.4, 1.8, 0, Math.PI * 2);
  c2d.arc(r * 0.6, r * 0.4, 1.8, 0, Math.PI * 2);
  c2d.fill();

  c2d.fillStyle = palette.amber;
  c2d.beginPath();
  c2d.arc(r * 0.85, -r * 0.2, 1.4, 0, Math.PI * 2);
  c2d.arc(r * 0.85, r * 0.2, 1.4, 0, Math.PI * 2);
  c2d.fill();

  if (palette.isColorblind) {
    c2d.strokeStyle = palette.hudText;
    c2d.lineWidth = 1.5;
    c2d.beginPath();
    c2d.arc(0, 0, r, 0, Math.PI * 2);
    c2d.stroke();
  }

  c2d.restore();
}

export const drawCentipedeHead: ShapeDrawer<CanvasRenderingContext2D, CentipedeComponentRegistry> = {
  draw(ctx, world, entity) {
    renderCentipedeHead(ctx, world as CentipedeWorld, entity);
  }
};

export function renderCentipedeBody(ctx: RenderContext, world: CentipedeWorld, entity: Entity): void {
  const c2d = ctx as CanvasRenderingContext2D;
  const { palette, offsetX, offsetY, radius: r, segmentIndex: idx } = getCentipedeBodyVisualContext(world, entity);

  c2d.save();
  if (offsetX !== 0 || offsetY !== 0) {
    c2d.translate(offsetX, offsetY);
  }

  const legAngle = Date.now() * 0.015 + idx * 0.5;
  const legOffset = Math.sin(legAngle) * 2.5;

  c2d.strokeStyle = palette.centipedeLegs;
  c2d.lineWidth = 1.2;
  c2d.lineCap = "round";

  c2d.beginPath();
  c2d.moveTo(0, -r);
  c2d.lineTo(-1.5, -r - 3 + legOffset);
  c2d.moveTo(0, r);
  c2d.lineTo(-1.5, r + 3 - legOffset);
  c2d.stroke();

  c2d.fillStyle = palette.centipedeBody;
  c2d.beginPath();
  c2d.arc(0, 0, r, 0, Math.PI * 2);
  c2d.fill();

  c2d.fillStyle = palette.centipedeShine;
  c2d.beginPath();
  c2d.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, Math.PI * 2);
  c2d.fill();

  if (palette.isColorblind) {
    c2d.strokeStyle = palette.hudText;
    c2d.lineWidth = 1.0;
    c2d.beginPath();
    c2d.arc(0, 0, r, 0, Math.PI * 2);
    c2d.stroke();
  }

  c2d.restore();
}

export const drawCentipedeBody: ShapeDrawer<CanvasRenderingContext2D, CentipedeComponentRegistry> = {
  draw(ctx, world, entity) {
    renderCentipedeBody(ctx, world as CentipedeWorld, entity);
  }
};

export function renderMushroom(ctx: RenderContext, world: CentipedeWorld, entity: Entity): void {
  const c2d = ctx as CanvasRenderingContext2D;
  const { palette, isPoisoned, hp, scale, baseCapColor, quality } = getMushroomVisualContext(world, entity);

  c2d.save();
  c2d.scale(scale, scale);

  if (quality !== "low") {
    c2d.globalAlpha = (hp / 4) * 0.25;
    c2d.fillStyle = baseCapColor;
    c2d.beginPath();
    c2d.arc(0, 0, 7, 0, Math.PI * 2);
    c2d.fill();
    c2d.globalAlpha = 1.0;
  }

  c2d.fillStyle = palette.stem;
  c2d.fillRect(-1.5, 1, 3, 3.5);

  const lobeWidth = 2.2;
  const startX = -4.4;
  const heights = [3.5, 5.5, 5.5, 3.5];

  for (let i = 0; i < 4; i++) {
    const isLit = i < hp;
    const lobeColor = isLit ? baseCapColor : palette.lobeOff;

    if (isLit && isPoisoned) {
      const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
      c2d.globalAlpha = pulse;
    }

    c2d.fillStyle = lobeColor;
    const h = heights[i];
    c2d.fillRect(startX + i * lobeWidth, -h / 2 - 0.5, lobeWidth - 0.4, h);
    c2d.globalAlpha = 1.0;
  }

  c2d.fillStyle = palette.player;
  c2d.globalAlpha = 0.5;
  c2d.beginPath();
  c2d.arc(-2.5, -2, 0.8, 0, Math.PI * 2);
  c2d.fill();
  c2d.globalAlpha = 1.0;

  c2d.restore();
}

export const drawMushroom: ShapeDrawer<CanvasRenderingContext2D, CentipedeComponentRegistry> = {
  draw(ctx, world, entity) {
    renderMushroom(ctx, world as CentipedeWorld, entity);
  }
};

export function renderSpider(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const c2d = ctx as CanvasRenderingContext2D;
  const palette = getCentipedePalette(world);

  c2d.fillStyle = palette.amber;
  c2d.beginPath();
  c2d.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2);
  c2d.fill();

  const stride = Math.sin(Date.now() * 0.02) * 2;
  c2d.strokeStyle = palette.amber;
  c2d.lineWidth = 1.2;

  for (let i = 0; i < 4; i++) {
    const x = -3 + i * 2;
    const s = (i % 2 === 0 ? 1 : -1) * stride;
    c2d.beginPath();
    c2d.moveTo(x, -2);
    c2d.lineTo(x + s, -6);
    c2d.moveTo(x, 2);
    c2d.lineTo(x - s, 6);
    c2d.stroke();
  }

  if (palette.isColorblind) {
    c2d.strokeStyle = palette.hudText;
    c2d.lineWidth = 1.5;
    c2d.beginPath();
    c2d.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2);
    c2d.stroke();
  }
}

export const drawSpider: ShapeDrawer<CanvasRenderingContext2D, CentipedeComponentRegistry> = {
  draw(ctx, world, entity) {
    renderSpider(ctx, world as CentipedeWorld, entity);
  }
};

export function renderFlea(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const c2d = ctx as CanvasRenderingContext2D;
  const config = world.getResource<CentipedeConfig>("GameConfig");
  const palette = getCentipedePalette(world);

  c2d.fillStyle = palette.amber;
  c2d.beginPath();
  c2d.arc(0, -2, 3.5, Math.PI, 0);
  c2d.lineTo(0, 5);
  c2d.closePath();
  c2d.fill();

  if (config?.visual?.quality !== "low") {
    c2d.globalAlpha = 0.3;
    c2d.fillStyle = palette.amber;
    c2d.beginPath();
    c2d.arc(0, -6, 2.5, 0, Math.PI * 2);
    c2d.arc(0, -10, 1.5, 0, Math.PI * 2);
    c2d.fill();
    c2d.globalAlpha = 1.0;
  }

  if (palette.isColorblind) {
    c2d.strokeStyle = palette.hudText;
    c2d.lineWidth = 1.5;
    c2d.stroke();
  }
}

export const drawFlea: ShapeDrawer<CanvasRenderingContext2D, CentipedeComponentRegistry> = {
  draw(ctx, world, entity) {
    renderFlea(ctx, world as CentipedeWorld, entity);
  }
};

export function renderScorpion(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const c2d = ctx as CanvasRenderingContext2D;
  const palette = getCentipedePalette(world);

  c2d.fillStyle = palette.toxin;
  c2d.beginPath();
  c2d.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
  c2d.fill();

  c2d.strokeStyle = palette.toxin;
  c2d.lineWidth = 1.5;
  c2d.beginPath();
  c2d.moveTo(-5, 0);
  c2d.quadraticCurveTo(-8, -4, -6, -6);
  c2d.stroke();

  if (palette.isColorblind) {
    c2d.strokeStyle = palette.hudText;
    c2d.lineWidth = 1.5;
    c2d.beginPath();
    c2d.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
    c2d.stroke();
  }
}

export const drawScorpion: ShapeDrawer<CanvasRenderingContext2D, CentipedeComponentRegistry> = {
  draw(ctx, world, entity) {
    renderScorpion(ctx, world as CentipedeWorld, entity);
  }
};

export function renderShooter(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const c2d = ctx as CanvasRenderingContext2D;
  const palette = getCentipedePalette(world);

  c2d.fillStyle = palette.player;
  c2d.beginPath();
  c2d.moveTo(0, -6);
  c2d.lineTo(5, 5);
  c2d.lineTo(0, 2);
  c2d.lineTo(-5, 5);
  c2d.closePath();
  c2d.fill();

  c2d.fillStyle = palette.playerAccent;
  c2d.beginPath();
  c2d.arc(0, -1, 1.8, 0, Math.PI * 2);
  c2d.fill();
}

export const drawShooter: ShapeDrawer<CanvasRenderingContext2D, CentipedeComponentRegistry> = {
  draw(ctx, world, entity) {
    renderShooter(ctx, world as CentipedeWorld, entity);
  }
};

export function renderDart(ctx: RenderContext, world: CentipedeWorld, _entity: Entity): void {
  const c2d = ctx as CanvasRenderingContext2D;
  const palette = getCentipedePalette(world);

  c2d.strokeStyle = palette.playerAccent;
  c2d.lineWidth = 3;
  c2d.lineCap = "round";
  c2d.beginPath();
  c2d.moveTo(0, -5);
  c2d.lineTo(0, 5);
  c2d.stroke();
}

export const drawDart: ShapeDrawer<CanvasRenderingContext2D, CentipedeComponentRegistry> = {
  draw(ctx, world, entity) {
    renderDart(ctx, world as CentipedeWorld, entity);
  }
};
