import { SOLAR_GARDEN_THEME, SOLAR_GARDEN_VARIANTS } from "../../../theme/solarGardenTheme";
import { SOLAR_GARDEN_DEBUG_FLAGS } from "../../../theme/solarGardenDebug";
import { IDrawAdapter } from "./DrawAdapter";

/**
 * Dual-Shell Rule: Render enemy projectiles in three perceptual passes for maximum readability:
 * PASS 1 — DARK CONTRAST SHELL (BIO_BLACK)
 * PASS 2 — SATURATED THREAT BODY (THREAT_ORANGE / BIO_MAGENTA / BIO_ACID)
 * PASS 3 — WHITE CORE (SOLAR_WHITE)
 */
export function drawDualShellBullet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  bodyColor: string = SOLAR_GARDEN_THEME.THREAT_ORANGE,
  shellPadding = 2.5,
  coreRatio = 0.4
): void {
  const useShell = SOLAR_GARDEN_DEBUG_FLAGS.bulletShell;

  // PASS 1 — DARK CONTRAST SHELL
  if (useShell) {
    ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_BLACK;
    ctx.beginPath();
    ctx.arc(x, y, radius + shellPadding, 0, Math.PI * 2);
    ctx.fill();
  }

  // PASS 2 — THREAT COLOR BODY
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // PASS 3 — WHITE CORE
  ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_WHITE;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, radius * coreRatio), 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Adapter-based Dual-Shell Bullet rendering for Canvas / Skia abstraction.
 */
export function drawDualShellBulletAdapter(
  adapter: IDrawAdapter,
  x: number,
  y: number,
  radius: number,
  bodyColor: string = SOLAR_GARDEN_THEME.THREAT_ORANGE,
  shellPadding = 2.5,
  coreRatio = 0.4
): void {
  const useShell = SOLAR_GARDEN_DEBUG_FLAGS.bulletShell;

  if (useShell) {
    adapter.fillCircle(x, y, radius + shellPadding, SOLAR_GARDEN_THEME.BIO_BLACK);
  }
  adapter.fillCircle(x, y, radius, bodyColor);
  adapter.fillCircle(x, y, Math.max(1, radius * coreRatio), SOLAR_GARDEN_THEME.SOLAR_WHITE);
}

/**
 * Pure, deterministic time-based deformation formula:
 * baseWidth * (1 + amplitude * Math.sin(frequency * time))
 */
export function computeBiomechanicalDeformation(
  baseSize: number,
  time: number,
  amplitude = 0.08,
  frequency = 4.0
): number {
  return baseSize * (1 + amplitude * Math.sin(frequency * time));
}

/**
 * Solar Geometry Grammar: White porcelain armor plate with gold trim and clean symmetry.
 */
export function drawSolarPorcelainPlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 4,
  goldTrim = true
): void {
  ctx.save();
  ctx.translate(x, y);

  // Porcelain White Body
  ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_WHITE;
  ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
  ctx.lineWidth = goldTrim ? 1.5 : 1;

  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-w / 2, -h / 2, w, h, radius);
  } else {
    ctx.rect(-w / 2, -h / 2, w, h);
  }
  ctx.fill();
  if (goldTrim) {
    ctx.stroke();
  }

  // Crystalline highlight line
  ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_CYAN;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w * 0.35, -h * 0.25);
  ctx.lineTo(w * 0.35, -h * 0.25);
  ctx.stroke();

  ctx.restore();
}

/**
 * Biomechanical Corruption Grammar: Overlapping dark chitin plates with synthetic muscle.
 */
export function drawBiomechanicalChitinPlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  time: number,
  muscleColor: string = SOLAR_GARDEN_THEME.BIO_MAGENTA
): void {
  const deformedW = computeBiomechanicalDeformation(width, time, 0.06, 3.5);
  const deformedH = computeBiomechanicalDeformation(height, time + 0.5, 0.05, 3.0);

  ctx.save();
  ctx.translate(x, y);

  // Synthetic Muscle Layer
  ctx.strokeStyle = muscleColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-deformedW * 0.4, 0);
  ctx.lineTo(deformedW * 0.4, 0);
  ctx.stroke();

  // Dark Chitin Armor Shell
  ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_BLACK;
  ctx.strokeStyle = muscleColor;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(0, -deformedH * 0.5);
  ctx.lineTo(deformedW * 0.5, -deformedH * 0.2);
  ctx.lineTo(deformedW * 0.4, deformedH * 0.5);
  ctx.lineTo(-deformedW * 0.4, deformedH * 0.5);
  ctx.lineTo(-deformedW * 0.5, -deformedH * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Biomechanical Eye/Lens with chitin eyelids and acid/magenta pulse.
 */
export function drawBiomechanicalEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
  hpRatio = 1.0
): void {
  const eyePulse = computeBiomechanicalDeformation(radius, time, 0.1, 5.0);
  const pupilColor = hpRatio < 0.2 ? SOLAR_GARDEN_THEME.BIO_ACID : SOLAR_GARDEN_THEME.BIO_MAGENTA;

  ctx.save();
  ctx.translate(x, y);

  // Chitin Sockets
  ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_BLACK;
  ctx.beginPath();
  ctx.arc(0, 0, eyePulse + 3, 0, Math.PI * 2);
  ctx.fill();

  // Muscle Outer Ring
  ctx.fillStyle = pupilColor;
  ctx.beginPath();
  ctx.arc(0, 0, eyePulse, 0, Math.PI * 2);
  ctx.fill();

  // White Core / Pupil Lens
  ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_WHITE;
  ctx.beginPath();
  ctx.ellipse(0, 0, eyePulse * 0.35, eyePulse * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Death Fracture Visual Effect:
 * Replaces generic fire/smoke explosions with:
 * IMPACT -> CRACKS (BIO_MAGENTA / BIO_ACID) -> FLASH -> CHITIN PETALS -> SLOW DESCENT -> FADE
 */
export function drawDeathFractureEffect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  progress: number
): void {
  if (!SOLAR_GARDEN_DEBUG_FLAGS.deathFracture) return;

  ctx.save();
  ctx.translate(x, y);

  const alpha = Math.max(0, 1.0 - progress);

  // 1. Initial Impact Flash & Cracks (progress < 0.25)
  if (progress < 0.25) {
    ctx.strokeStyle = SOLAR_GARDEN_THEME.BIO_MAGENTA;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const len = size * (0.3 + progress * 2.0);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
      ctx.stroke();
    }
  }

  // 2. Chitin Petals (progress >= 0.15)
  const petalCount = 6;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i * Math.PI * 2) / petalCount;
    const fallDistance = progress * size * 1.5;
    const px = Math.cos(angle) * (size * 0.4 + progress * size * 0.8);
    const py = Math.sin(angle) * (size * 0.4 + progress * size * 0.8) + fallDistance * 0.5;
    const petalSize = Math.max(1, size * 0.2 * alpha);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle + progress * 4);

    ctx.fillStyle = i % 2 === 0 ? SOLAR_GARDEN_THEME.BIO_BLACK : SOLAR_GARDEN_THEME.BIO_MAGENTA;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.ellipse(0, 0, petalSize * 0.5, petalSize, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

export type GraphicsQualityLevel = "HIGH" | "MEDIUM" | "LOW";

/**
 * Returns particle density scale factor for particle degradation.
 */
export function getParticleDensityMultiplier(quality: GraphicsQualityLevel = "HIGH"): number {
  if (!SOLAR_GARDEN_DEBUG_FLAGS.particles) return 0;
  switch (quality) {
    case "LOW":
      return 0.3;
    case "MEDIUM":
      return 0.6;
    case "HIGH":
    default:
      return 1.0;
  }
}
