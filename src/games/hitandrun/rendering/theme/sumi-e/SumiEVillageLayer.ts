/**
 * Repeated village-house silhouettes for the Sumi-e Hit & Run backdrop.
 *
 * The same house primitive is reused across deterministic depth layers. Camera
 * parallax, scale and ink opacity create depth without adding gameplay entities.
 */
export interface SumiEVillageHousePlacement {
  x: number;
  baselineY: number;
  scale: number;
  alpha: number;
  depth: number;
}

const VILLAGE_LAYERS = [
  { depth: 0.08, spacing: 190, offset: 24, yRatio: 0.315, scale: 0.34, alpha: 0.13 },
  { depth: 0.22, spacing: 245, offset: 92, yRatio: 0.375, scale: 0.52, alpha: 0.22 },
  { depth: 0.42, spacing: 310, offset: 156, yRatio: 0.425, scale: 0.72, alpha: 0.32 }
] as const;

/** Pure placement calculation: stable across frames and independent of RNG. */
export function getSumiEVillageHousePlacements(
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number
): SumiEVillageHousePlacement[] {
  const placements: SumiEVillageHousePlacement[] = [];

  for (const layer of VILLAGE_LAYERS) {
    const scrollX = cameraX * layer.depth;
    const firstIndex = Math.floor((scrollX - layer.offset - 110 * layer.scale) / layer.spacing);
    const lastIndex = Math.ceil((scrollX + viewportWidth - layer.offset + 110 * layer.scale) / layer.spacing);

    for (let index = firstIndex; index <= lastIndex; index++) {
      placements.push({
        x: index * layer.spacing + layer.offset - scrollX,
        baselineY: viewportHeight * layer.yRatio,
        scale: layer.scale,
        alpha: layer.alpha,
        depth: layer.depth
      });
    }
  }

  return placements;
}

/** Draw one reusable Japanese rural house primitive at the requested scale. */
function drawHouse(ctx: CanvasRenderingContext2D): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Shadow and timber body
  ctx.fillStyle = "#716b5b";
  ctx.beginPath();
  ctx.ellipse(0, 1, 48, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c9bea3";
  ctx.strokeStyle = "#25251f";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-32, -35);
  ctx.lineTo(32, -35);
  ctx.lineTo(29, -3);
  ctx.lineTo(-29, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Broad thatched roof with slightly curved eaves
  ctx.fillStyle = "#655b49";
  ctx.beginPath();
  ctx.moveTo(-52, -36);
  ctx.quadraticCurveTo(-39, -43, -27, -60);
  ctx.lineTo(-14, -70);
  ctx.quadraticCurveTo(0, -75, 14, -70);
  ctx.lineTo(27, -60);
  ctx.quadraticCurveTo(39, -43, 52, -36);
  ctx.quadraticCurveTo(27, -30, 0, -33);
  ctx.quadraticCurveTo(-27, -30, -52, -36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Straw strokes keep the same hand-inked identity at every distance
  ctx.strokeStyle = "#b7a887";
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 8, -66 + Math.abs(i) * 2.2);
    ctx.lineTo(i * 10, -39 + Math.abs(i) * 0.7);
    ctx.stroke();
  }

  // Front beams, door and two paper windows
  ctx.strokeStyle = "#292820";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-31, -29);
  ctx.lineTo(31, -29);
  ctx.moveTo(-31, -5);
  ctx.lineTo(31, -5);
  ctx.moveTo(0, -29);
  ctx.lineTo(0, -4);
  ctx.stroke();

  ctx.fillStyle = "#e4d8bd";
  ctx.fillRect(-25, -25, 16, 12);
  ctx.fillRect(9, -25, 16, 12);
  ctx.strokeRect(-25, -25, 16, 12);
  ctx.strokeRect(9, -25, 16, 12);
  ctx.beginPath();
  ctx.moveTo(-17, -25);
  ctx.lineTo(-17, -13);
  ctx.moveTo(17, -25);
  ctx.lineTo(17, -13);
  ctx.moveTo(-25, -19);
  ctx.lineTo(-9, -19);
  ctx.moveTo(9, -19);
  ctx.lineTo(25, -19);
  ctx.stroke();

  ctx.fillStyle = "#4a4538";
  ctx.fillRect(-6, -22, 12, 19);
  ctx.strokeRect(-6, -22, 12, 19);
}

/** Draw the same house repeatedly, with lower contrast and slower parallax at distance. */
export function drawSumiEVillageLayer(
  ctx: CanvasRenderingContext2D,
  viewportWidth: number,
  viewportHeight: number,
  cameraX: number
): void {
  const houses = getSumiEVillageHousePlacements(viewportWidth, viewportHeight, cameraX);

  for (const house of houses) {
    // Cull by bounds, including a little bleed for roofs at screen edges.
    const width = 104 * house.scale;
    if (house.x + width / 2 < -8 || house.x - width / 2 > viewportWidth + 8) continue;

    ctx.save();
    ctx.globalAlpha = house.alpha;
    ctx.translate(house.x, house.baselineY);
    ctx.scale(house.scale, house.scale);
    drawHouse(ctx);
    ctx.restore();
  }
}
