import {
  World,
  ShapeDrawer,
  Renderer,
  TransformComponent,
  RenderComponent,
  ColliderComponent,
  CircleShape,
  TTLComponent
} from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import {
  drawAsteroidsPlayerShip,
  drawAsteroidsAsteroid,
  drawAsteroidsBullet
} from "./AsteroidsCanvasVisuals";
import {
  drawSkiaAsteroidsPlayerShip,
  drawSkiaAsteroidsAsteroid,
  drawSkiaAsteroidsBullet
} from "./AsteroidsSkiaVisuals";

// Dynamically import Skia safely to support Node-based Jest tests without throwing
let Skia: any = null;
try {
  Skia = require("@shopify/react-native-skia").Skia;
} catch {
  // Silent fallback in test environments
}

// -------------------------------------------------------------
// Pre-defined Rugged Asteroid Vertex Patterns
// -------------------------------------------------------------
interface Point {
  x: number;
  y: number;
}

const ASTEROID_SHAPES: Point[][] = [
  // Shape 0: Standard rocky shape
  [
    { x: 1.0, y: 0.0 }, { x: 0.75, y: 0.5 }, { x: 0.4, y: 0.9 }, { x: -0.1, y: 1.0 },
    { x: -0.6, y: 0.75 }, { x: -1.0, y: 0.2 }, { x: -0.8, y: -0.5 }, { x: -0.3, y: -0.9 },
    { x: 0.3, y: -0.8 }, { x: 0.8, y: -0.4 }
  ],
  // Shape 1: Indented/Rugged
  [
    { x: 0.9, y: 0.1 }, { x: 0.7, y: 0.7 }, { x: 0.1, y: 0.9 }, { x: -0.5, y: 0.8 },
    { x: -0.9, y: 0.3 }, { x: -0.8, y: -0.4 }, { x: -0.3, y: -0.8 }, { x: 0.2, y: -1.0 },
    { x: 0.7, y: -0.7 }, { x: 0.9, y: -0.2 }
  ],
  // Shape 2: Spiky
  [
    { x: 1.0, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.1, y: 1.0 }, { x: -0.4, y: 0.6 },
    { x: -0.9, y: 0.4 }, { x: -0.7, y: -0.2 }, { x: -0.5, y: -0.8 }, { x: 0.1, y: -0.9 },
    { x: 0.6, y: -0.6 }, { x: 0.8, y: -0.1 }
  ],
  // Shape 3: Elongated
  [
    { x: 1.1, y: 0.0 }, { x: 0.8, y: 0.4 }, { x: 0.3, y: 0.6 }, { x: -0.2, y: 0.7 },
    { x: -0.7, y: 0.4 }, { x: -1.0, y: 0.0 }, { x: -0.8, y: -0.4 }, { x: -0.3, y: -0.7 },
    { x: 0.2, y: -0.6 }, { x: 0.7, y: -0.3 }
  ],
  // Shape 4: Hexagonal style
  [
    { x: 0.95, y: 0.3 }, { x: 0.45, y: 0.85 }, { x: -0.45, y: 0.85 }, { x: -0.95, y: 0.3 },
    { x: -0.95, y: -0.3 }, { x: -0.45, y: -0.85 }, { x: 0.45, y: -0.85 }, { x: 0.95, y: -0.3 }
  ],
  // Shape 5: Cratered
  [
    { x: 0.85, y: 0.15 }, { x: 0.6, y: 0.6 }, { x: 0.0, y: 0.85 }, { x: -0.6, y: 0.6 },
    { x: -0.85, y: 0.0 }, { x: -0.5, y: -0.5 }, { x: 0.0, y: -0.85 }, { x: 0.5, y: -0.6 }
  ],
  // Shape 6: Aggressive
  [
    { x: 1.0, y: -0.1 }, { x: 0.8, y: 0.6 }, { x: 0.2, y: 0.9 }, { x: -0.3, y: 0.8 },
    { x: -0.8, y: 0.5 }, { x: -1.0, y: -0.1 }, { x: -0.6, y: -0.7 }, { x: 0.0, y: -0.9 },
    { x: 0.5, y: -0.8 }, { x: 0.9, y: -0.5 }
  ],
  // Shape 7: Asymmetrical
  [
    { x: 1.05, y: 0.05 }, { x: 0.65, y: 0.75 }, { x: -0.15, y: 0.95 }, { x: -0.75, y: 0.55 },
    { x: -0.95, y: -0.15 }, { x: -0.55, y: -0.75 }, { x: 0.15, y: -0.95 }, { x: 0.75, y: -0.55 }
  ]
];

// Helper to determine if an entity is thrusting
function getIsThrusting(world: World<any>, entity: number): boolean {
  const inputComp = world.getComponent(entity, "Input") as any;
  if (!inputComp) return false;

  const actions = inputComp.actions;
  if (!actions) return false;

  if (actions instanceof Set) {
    return actions.has("thrust");
  }
  if (Array.isArray(actions)) {
    return actions.includes("thrust");
  }
  if (typeof actions === "object") {
    return actions["thrust"] === true;
  }
  return false;
}

// -------------------------------------------------------------
// HTML5 Canvas Shape Drawers
// -------------------------------------------------------------

/**
 * Beautiful, high-fidelity custom ShapeDrawer for the player ship in Canvas.
 */
export const drawAsteroidsShip: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size ?? 30;
    const radius = size / 2;

    ctx.save();

    // Support hit flashing
    let outlineColor = "#00f0ff";
    let bodyColor = "rgba(22, 22, 26, 0.85)";
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(world.tick / 2) % 2 === 0) {
        outlineColor = "#ffffff";
        bodyColor = "rgba(255, 255, 255, 0.5)";
      }
    }

    // --- 1. Draw Thruster Plasma Flame ---
    const isThrusting = getIsThrusting(world, entity);
    if (isThrusting) {
      const flickerFactor = 1.0 + 0.3 * Math.sin(world.tick * 0.8);
      const outerFlameLength = radius * 1.5 * flickerFactor;
      const innerFlameLength = radius * 0.8 * flickerFactor;

      // Outer Flame
      ctx.fillStyle = "#ff5d00";
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.5, -radius * 0.3);
      ctx.lineTo(-radius * 0.5 - outerFlameLength, 0);
      ctx.lineTo(-radius * 0.5, radius * 0.3);
      ctx.closePath();
      ctx.fill();

      // Inner Hot Core Flame
      ctx.fillStyle = "#ffea00";
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.5, -radius * 0.15);
      ctx.lineTo(-radius * 0.5 - innerFlameLength, 0);
      ctx.lineTo(-radius * 0.5, radius * 0.15);
      ctx.closePath();
      ctx.fill();
    }

    // --- 2. Draw Ship Wedge Body ---
    ctx.globalAlpha = render.opacity;
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";

    // Glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = outlineColor;

    ctx.beginPath();
    ctx.moveTo(radius, 0); // Nose/Tip points right
    ctx.lineTo(-radius, -radius * 0.7); // Back top corner
    ctx.lineTo(-radius * 0.5, 0); // Back center indent
    ctx.lineTo(-radius, radius * 0.7); // Back bottom corner
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Disable shadow blur for inner canopy
    ctx.shadowBlur = 0;

    // --- 3. Draw Cockpit Canopy Hot Core ---
    ctx.fillStyle = "#5cf2ff";
    ctx.beginPath();
    ctx.moveTo(radius * 0.4, 0);
    ctx.lineTo(-radius * 0.1, -radius * 0.2);
    ctx.lineTo(-radius * 0.3, 0);
    ctx.lineTo(-radius * 0.1, radius * 0.2);
    ctx.closePath();
    ctx.fill();

    // --- 4. Draw Invulnerability Shield Pulse ---
    const isInvulnerable = world.hasComponent(entity, "Invulnerable" as any);
    if (isInvulnerable) {
      const pulse = 1.0 + 0.08 * Math.sin(world.tick * 0.2);
      ctx.strokeStyle = "rgba(0, 240, 255, 0.45)";
      ctx.lineWidth = 2.0;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.6 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
};

/**
 * Custom glowing laser bullet ShapeDrawer in Canvas.
 */
export const drawAsteroidsBullet: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size ?? 6;

    ctx.save();

    // Neon laser Capsule
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    // Centered horizontal capsule along heading
    ctx.rect(-size * 1.5, -size * 0.4, size * 3, size * 0.8);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Beautiful, rugged, rotating procedural Asteroid ShapeDrawer in Canvas.
 */
export const drawAsteroidsAsteroid: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const collider = world.getComponent(entity, "Collider") as ColliderComponent | undefined;
    const radius = (collider?.shape as CircleShape)?.radius ?? 20;

    const shapeIndex = entity % ASTEROID_SHAPES.length;
    const vertices = ASTEROID_SHAPES[shapeIndex];

    ctx.save();

    let outlineColor = "#a78bfa"; // Retro purple-violet neon glow
    let bodyColor = "rgba(22, 22, 26, 0.9)"; // Deep space solid body

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(world.tick / 2) % 2 === 0) {
        outlineColor = "#ffffff";
        bodyColor = "rgba(255, 255, 255, 0.5)";
      }
    }

    // Glowing Neon outline
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2.0;
    ctx.lineJoin = "round";
    ctx.shadowBlur = 10;
    ctx.shadowColor = outlineColor;

    ctx.beginPath();
    ctx.moveTo(vertices[0].x * radius, vertices[0].y * radius);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x * radius, vertices[i].y * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Clean shadow for inner cracks/craters
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(167, 139, 250, 0.4)";
    ctx.lineWidth = 1.5;

    // Deterministic fracture lines based on vertices
    ctx.beginPath();
    ctx.moveTo(vertices[1].x * radius * 0.3, vertices[1].y * radius * 0.3);
    ctx.lineTo(vertices[5].x * radius * 0.4, vertices[5].y * radius * 0.4);
    ctx.moveTo(vertices[3].x * radius * 0.3, vertices[3].y * radius * 0.3);
    ctx.lineTo(vertices[7].x * radius * 0.5, vertices[7].y * radius * 0.5);
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Beautiful glowing space dust particle ShapeDrawer in Canvas.
 */
export const drawAsteroidsParticle: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size ?? 2;
    const ttl = world.getComponent(entity, "TTL") as TTLComponent | undefined;
    let ratio = 1.0;
    if (ttl && ttl.timeLeft) {
      ratio = Math.max(0, ttl.remaining / ttl.timeLeft);
    }

    ctx.save();
    ctx.fillStyle = render.color || "#ffffff";
    ctx.globalAlpha = render.opacity * ratio;

    ctx.beginPath();
    ctx.arc(0, 0, (size / 2) * ratio, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};


// -------------------------------------------------------------
// React Native Skia Shape Drawers
// -------------------------------------------------------------

/**
 * Corresponding Skia ShapeDrawer for the player ship.
 */
export const drawAsteroidsShipSkia: ShapeDrawer<any, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size ?? 30;
    const radius = size / 2;

    canvas.save();

    let outlineColor = "#00f0ff";
    let bodyColor = "rgba(22, 22, 26, 0.85)";
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(world.tick / 2) % 2 === 0) {
        outlineColor = "#ffffff";
        bodyColor = "rgba(255, 255, 255, 0.5)";
      }
    }

    // 1. Draw Thruster Plasma Flame (Skia Path)
    const isThrusting = getIsThrusting(world, entity);
    if (isThrusting) {
      const flickerFactor = 1.0 + 0.3 * Math.sin(world.tick * 0.8);
      const outerFlameLength = radius * 1.5 * flickerFactor;
      const innerFlameLength = radius * 0.8 * flickerFactor;

      const paintOuter = Skia.Paint();
      paintOuter.setColor(Skia.Color("#ff5d00"));
      paintOuter.setAlphaf(0.8);
      const pathOuter = Skia.Path.Make();
      pathOuter.moveTo(-radius * 0.5, -radius * 0.3);
      pathOuter.lineTo(-radius * 0.5 - outerFlameLength, 0);
      pathOuter.lineTo(-radius * 0.5, radius * 0.3);
      pathOuter.close();
      canvas.drawPath(pathOuter, paintOuter);

      const paintInner = Skia.Paint();
      paintInner.setColor(Skia.Color("#ffea00"));
      paintInner.setAlphaf(1.0);
      const pathInner = Skia.Path.Make();
      pathInner.moveTo(-radius * 0.5, -radius * 0.15);
      pathInner.lineTo(-radius * 0.5 - innerFlameLength, 0);
      pathInner.lineTo(-radius * 0.5, radius * 0.15);
      pathInner.close();
      canvas.drawPath(pathInner, paintInner);
    }

    // 2. Draw Wedge Ship Body
    const paintFill = Skia.Paint();
    paintFill.setColor(Skia.Color(bodyColor));
    paintFill.setStyle(Skia.PaintStyle.Fill);

    const paintStroke = Skia.Paint();
    paintStroke.setColor(Skia.Color(outlineColor));
    paintStroke.setStyle(Skia.PaintStyle.Stroke);
    paintStroke.setStrokeWidth(2.5);

    const pathShip = Skia.Path.Make();
    pathShip.moveTo(radius, 0);
    pathShip.lineTo(-radius, -radius * 0.7);
    pathShip.lineTo(-radius * 0.5, 0);
    pathShip.lineTo(-radius, radius * 0.7);
    pathShip.close();

    canvas.drawPath(pathShip, paintFill);
    canvas.drawPath(pathShip, paintStroke);

    // 3. Draw Cockpit Canopy
    const paintCanopy = Skia.Paint();
    paintCanopy.setColor(Skia.Color("#5cf2ff"));
    paintCanopy.setStyle(Skia.PaintStyle.Fill);

    const pathCanopy = Skia.Path.Make();
    pathCanopy.moveTo(radius * 0.4, 0);
    pathCanopy.lineTo(-radius * 0.1, -radius * 0.2);
    pathCanopy.lineTo(-radius * 0.3, 0);
    pathCanopy.lineTo(-radius * 0.1, radius * 0.2);
    pathCanopy.close();
    canvas.drawPath(pathCanopy, paintCanopy);

    // 4. Draw Shield
    const isInvulnerable = world.hasComponent(entity, "Invulnerable" as any);
    if (isInvulnerable) {
      const pulse = 1.0 + 0.08 * Math.sin(world.tick * 0.2);
      const paintShield = Skia.Paint();
      paintShield.setColor(Skia.Color("rgba(0, 240, 255, 0.45)"));
      paintShield.setStyle(Skia.PaintStyle.Stroke);
      paintShield.setStrokeWidth(2.0);
      canvas.drawCircle(0, 0, radius * 1.6 * pulse, paintShield);
    }

    canvas.restore();
  }
};

/**
 * Corresponding Skia ShapeDrawer for laser bullets.
 */
export const drawAsteroidsBulletSkia: ShapeDrawer<any, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size ?? 6;

    canvas.save();

    const paintFill = Skia.Paint();
    paintFill.setColor(Skia.Color("#ffffff"));
    paintFill.setStyle(Skia.PaintStyle.Fill);

    const paintStroke = Skia.Paint();
    paintStroke.setColor(Skia.Color("#00ffff"));
    paintStroke.setStyle(Skia.PaintStyle.Stroke);
    paintStroke.setStrokeWidth(2.0);

    const rect = Skia.XYWHRect(-size * 1.5, -size * 0.4, size * 3, size * 0.8);
    canvas.drawRect(rect, paintFill);
    canvas.drawRect(rect, paintStroke);

    canvas.restore();
  }
};

/**
 * Corresponding Skia ShapeDrawer for rotating rugged asteroids.
 */
export const drawAsteroidsAsteroidSkia: ShapeDrawer<any, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const collider = world.getComponent(entity, "Collider") as ColliderComponent | undefined;
    const radius = (collider?.shape as CircleShape)?.radius ?? 20;

    const shapeIndex = entity % ASTEROID_SHAPES.length;
    const vertices = ASTEROID_SHAPES[shapeIndex];

    canvas.save();

    let outlineColor = "#a78bfa";
    let bodyColor = "rgba(22, 22, 26, 0.9)";
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if (Math.floor(world.tick / 2) % 2 === 0) {
        outlineColor = "#ffffff";
        bodyColor = "rgba(255, 255, 255, 0.5)";
      }
    }

    const paintFill = Skia.Paint();
    paintFill.setColor(Skia.Color(bodyColor));
    paintFill.setStyle(Skia.PaintStyle.Fill);

    const paintStroke = Skia.Paint();
    paintStroke.setColor(Skia.Color(outlineColor));
    paintStroke.setStyle(Skia.PaintStyle.Stroke);
    paintStroke.setStrokeWidth(2.0);

    const pathAsteroid = Skia.Path.Make();
    pathAsteroid.moveTo(vertices[0].x * radius, vertices[0].y * radius);
    for (let i = 1; i < vertices.length; i++) {
      pathAsteroid.lineTo(vertices[i].x * radius, vertices[i].y * radius);
    }
    pathAsteroid.close();

    canvas.drawPath(pathAsteroid, paintFill);
    canvas.drawPath(pathAsteroid, paintStroke);

    // Draw fractures
    const paintCracks = Skia.Paint();
    paintCracks.setColor(Skia.Color("rgba(167, 139, 250, 0.4)"));
    paintCracks.setStyle(Skia.PaintStyle.Stroke);
    paintCracks.setStrokeWidth(1.5);

    canvas.drawLine(
      vertices[1].x * radius * 0.3, vertices[1].y * radius * 0.3,
      vertices[5].x * radius * 0.4, vertices[5].y * radius * 0.4,
      paintCracks
    );
    canvas.drawLine(
      vertices[3].x * radius * 0.3, vertices[3].y * radius * 0.3,
      vertices[7].x * radius * 0.5, vertices[7].y * radius * 0.5,
      paintCracks
    );

    canvas.restore();
  }
};

/**
 * Corresponding Skia ShapeDrawer for particles.
 */
export const drawAsteroidsParticleSkia: ShapeDrawer<any, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
    if (!render) return;

    const size = render.size ?? 2;
    const ttl = world.getComponent(entity, "TTL") as TTLComponent | undefined;
    let ratio = 1.0;
    if (ttl && ttl.timeLeft) {
      ratio = Math.max(0, ttl.remaining / ttl.timeLeft);
    }

    canvas.save();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(render.color || "#ffffff"));
    paint.setAlphaf(render.opacity * ratio);

    canvas.drawCircle(0, 0, (size / 2) * ratio, paint);
    canvas.restore();
  }
};


// -------------------------------------------------------------
// Centralized Initialization function
// -------------------------------------------------------------

/** @public */
export const initializeAsteroidsRenderer = (renderer: Renderer<AsteroidsComponentRegistry>) => {
  const r = renderer as any;
  if (r.type === "canvas") {
    r.registerShape("player_ship", drawAsteroidsPlayerShip);
    r.registerShape("asteroid", drawAsteroidsAsteroid);
    r.registerShape("bullet", drawAsteroidsBullet);
  } else if (r.type === "skia") {
    r.registerShape("player_ship", drawSkiaAsteroidsPlayerShip);
    r.registerShape("asteroid", drawSkiaAsteroidsAsteroid);
    r.registerShape("bullet", drawSkiaAsteroidsBullet);
  }
};
