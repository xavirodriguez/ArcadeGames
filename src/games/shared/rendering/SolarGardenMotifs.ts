import { SOLAR_GARDEN_PALETTE } from "./SolarGardenPalette";

/**
 * Shared visual drawing primitives for the Solar Garden material language.
 * Provides Canvas-compatible helpers for Porcelain, Gold Trim, Segmented Chitin, and Biomechanical Organs.
 */

/**
 * Draws a clean porcelain ceramic plate with gold inlay and optional cyan glow core.
 */
export function drawSolarPorcelainPlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 4
): void {
  ctx.save();
  ctx.translate(x, y);

  // Porcelain Surface
  ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarWhite;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-w / 2, -h / 2, w, h, radius);
  } else {
    ctx.rect(-w / 2, -h / 2, w, h);
  }
  ctx.fill();

  // Gold Trim Outline
  ctx.strokeStyle = SOLAR_GARDEN_PALETTE.solarGold;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Subdued inner glass shine
  ctx.fillStyle = SOLAR_GARDEN_PALETTE.glassPanel;
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h / 3);

  ctx.restore();
}

/**
 * Draws a leaf-shaped solar wing/panel with ceramic body and cyan energy vein.
 */
export function drawSolarLeafWing(
  ctx: CanvasRenderingContext2D,
  length: number,
  width: number,
  angle: number = 0
): void {
  ctx.save();
  ctx.rotate(angle);

  // Outer Leaf Silhouette
  ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarWhite;
  ctx.strokeStyle = SOLAR_GARDEN_PALETTE.solarGold;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  if (ctx.quadraticCurveTo) {
    ctx.quadraticCurveTo(width * 0.8, -length * 0.5, 0, -length);
    ctx.quadraticCurveTo(-width * 0.8, -length * 0.5, 0, 0);
  } else {
    ctx.lineTo(width * 0.5, -length * 0.5);
    ctx.lineTo(0, -length);
    ctx.lineTo(-width * 0.5, -length * 0.5);
  }
  ctx.fill();
  ctx.stroke();

  // Central Cyan Energy Vein
  ctx.strokeStyle = SOLAR_GARDEN_PALETTE.solarCyan;
  ctx.lineWidth = 2;
  ctx.shadowColor = SOLAR_GARDEN_PALETTE.solarCyan;
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -length * 0.85);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a segmented biomechanical chitin shell piece (black metal + magenta corruption vein).
 */
export function drawBiomechanicalChitin(
  ctx: CanvasRenderingContext2D,
  size: number,
  isMutated: boolean = false
): void {
  ctx.save();

  // Dark Segmented Shell
  ctx.fillStyle = SOLAR_GARDEN_PALETTE.bioBlack;
  ctx.strokeStyle = isMutated ? SOLAR_GARDEN_PALETTE.bioAcid : SOLAR_GARDEN_PALETTE.bioMagenta;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.8, -size * 0.3);
  ctx.lineTo(size * 0.6, size * 0.6);
  ctx.lineTo(-size * 0.6, size * 0.6);
  ctx.lineTo(-size * 0.8, -size * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pulsing Translucent Biological Organ Core
  const organColor = isMutated ? SOLAR_GARDEN_PALETTE.bioAcid : SOLAR_GARDEN_PALETTE.bioMagenta;
  ctx.fillStyle = organColor;
  ctx.shadowColor = organColor;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws an enemy threat projectile with crisp dark outline and glowing core for peak readability.
 */
export function drawThreatProjectile(
  ctx: CanvasRenderingContext2D,
  radius: number,
  coreColor: string = SOLAR_GARDEN_PALETTE.threatOrange
): void {
  ctx.save();

  // Dark Outline for Readability
  ctx.strokeStyle = SOLAR_GARDEN_PALETTE.bioBlack;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 1, 0, Math.PI * 2);
  ctx.stroke();

  // Glowing Core
  ctx.fillStyle = coreColor;
  ctx.shadowColor = coreColor;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Inner White Hotspot
  ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarWhite;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
