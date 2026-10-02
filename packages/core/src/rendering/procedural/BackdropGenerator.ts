import {
  BackdropConfig,
  BackdropSpec,
  BackdropLayerSpec,
  ChunkSpec,
  FantasyFeatureSpec,
  MacroZoneType,
  WaterfallSpec,
  RiverSpec,
  BackdropParticleSpec,
  BackdropPoint
} from "./BackdropTypes";
import { createMulberry32, hashChunkSeed } from "./Mulberry32";

/**
 * pure function to resolve macro zone based on base seed and chunk index.
 */
function resolveMacroZone(baseSeed: number, chunkX: number): MacroZoneType {
  const prng = createMulberry32(hashChunkSeed(baseSeed, 0, chunkX));
  const val = prng();
  if (val < 0.3) return "mountain";
  if (val < 0.6) return "valley";
  if (val < 0.85) return "plain";
  return "lake";
}

/**
 * Resolves entry and exit heights for a chunk layer to guarantee C0 continuity across chunks.
 */
function resolveChunkHeights(
  baseSeed: number,
  layerIndex: number,
  chunkX: number,
  baseY: number,
  heightVar: number
): { entryHeight: number; exitHeight: number } {
  const prevSeed = hashChunkSeed(baseSeed, layerIndex, chunkX - 1);
  const currSeed = hashChunkSeed(baseSeed, layerIndex, chunkX);

  const prevExitVal = createMulberry32(prevSeed + 100)();
  const currExitVal = createMulberry32(currSeed + 100)();

  const entryHeight = baseY + (prevExitVal - 0.5) * heightVar;
  const exitHeight = baseY + (currExitVal - 0.5) * heightVar;

  return { entryHeight, exitHeight };
}

/**
 * Generates smooth terrain points for a chunk layer connecting entry and exit heights.
 */
function generateLayerPoints(
  baseSeed: number,
  layerIndex: number,
  chunkX: number,
  chunkWidth: number,
  entryH: number,
  exitH: number,
  zone: MacroZoneType
): BackdropPoint[] {
  const points: BackdropPoint[] = [];
  const segments = 16;
  const stepX = chunkWidth / segments;
  const prng = createMulberry32(hashChunkSeed(baseSeed, layerIndex, chunkX));

  let roughness = 30;
  if (zone === "mountain") roughness = 60;
  else if (zone === "plain") roughness = 10;
  else if (zone === "lake") roughness = 5;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Linear interpolation between entry and exit height
    const baseH = entryH * (1 - t) + exitH * t;
    // Mid-chunk noise (ends at t=0 and t=1 are 0 for perfect continuity)
    const midDamp = Math.sin(t * Math.PI);
    const noise = (prng() - 0.5) * roughness * midDamp;
    const x = chunkX * chunkWidth + i * stepX;
    const y = baseH + noise;
    points.push({ x, y });
  }

  return points;
}

/**
 * Pure generator for procedural fantasy landscape backdrop specifications.
 * Completely deterministic and free of state or `Math.random` calls.
 *
 * @param config - Backdrop configuration.
 * @returns BackdropSpec data object.
 * @public
 */
export function generateBackdrop(config: BackdropConfig): BackdropSpec {
  const seed = config.seed >>> 0;
  const viewportWidth = config.viewportWidth;
  const viewportHeight = config.viewportHeight;
  const chunkWidth = config.chunkWidth ?? viewportWidth;
  const quality = config.quality ?? "high";
  const fantasyDensity = config.fantasyDensity ?? 1.0;

  // Global sky features (twin moons, auroras, background stars)
  const skyPRNG = createMulberry32(hashChunkSeed(seed, 999, 0));
  const skyFeatures: FantasyFeatureSpec[] = [];

  // Twin moons chance
  if (skyPRNG() < 0.4 * fantasyDensity) {
    skyFeatures.push({
      type: "twin_moons",
      x: viewportWidth * (0.6 + skyPRNG() * 0.25),
      y: viewportHeight * (0.15 + skyPRNG() * 0.15),
      scale: 1.0,
      alpha: 0.85,
      colorToken: config.theme.accentGlow
    });
  }

  // Aurora chance
  if (skyPRNG() < 0.35 * fantasyDensity) {
    skyFeatures.push({
      type: "aurora",
      x: viewportWidth * 0.5,
      y: viewportHeight * 0.2,
      scale: 1.2,
      alpha: 0.5,
      colorToken: config.theme.accentGlow
    });
  }

  // Particle generation for dynamic animation
  const particlePRNG = createMulberry32(hashChunkSeed(seed, 888, 0));
  const particlesCount = quality === "low" ? 12 : quality === "med" ? 25 : 45;
  const particles: BackdropParticleSpec[] = [];

  for (let i = 0; i < particlesCount; i++) {
    particles.push({
      x: particlePRNG() * viewportWidth,
      y: particlePRNG() * viewportHeight,
      size: 1 + particlePRNG() * 3,
      speedX: (particlePRNG() - 0.5) * 15,
      speedY: -5 - particlePRNG() * 15,
      alpha: 0.2 + particlePRNG() * 0.6,
      colorToken: config.theme.accentGlow
    });
  }

  // Generate chunks (0 and 1 for viewport coverage)
  const chunks: ChunkSpec[] = [];
  const chunkIndices = [0, 1];

  for (const chunkX of chunkIndices) {
    const zone = resolveMacroZone(seed, chunkX);
    const layers: BackdropLayerSpec[] = [];

    // Layer 0: Far Mountains (depth = 0.2)
    const { entryHeight: eH0, exitHeight: xH0 } = resolveChunkHeights(
      seed,
      0,
      chunkX,
      viewportHeight * 0.45,
      80
    );
    const pts0 = generateLayerPoints(seed, 0, chunkX, chunkWidth, eH0, xH0, zone);
    const waterfalls0: WaterfallSpec[] = [];
    const rivers0: RiverSpec[] = [];
    const fantasy0: FantasyFeatureSpec[] = [];

    // Layer 0 Fantasy Features (floating island or crystal spire)
    const layer0PRNG = createMulberry32(hashChunkSeed(seed, 0, chunkX));
    if (layer0PRNG() < 0.3 * fantasyDensity) {
      fantasy0.push({
        type: "floating_island",
        x: chunkX * chunkWidth + chunkWidth * (0.2 + layer0PRNG() * 0.6),
        y: viewportHeight * (0.2 + layer0PRNG() * 0.15),
        scale: 0.8 + layer0PRNG() * 0.4,
        alpha: 0.9,
        colorToken: config.theme.mountainFar
      });
    }

    layers.push({
      id: `far_mountains_chunk_${chunkX}`,
      name: "Far Mountains",
      depth: 0.2,
      points: pts0,
      fillColorToken: config.theme.mountainFar,
      strokeColorToken: config.theme.accentGlow,
      alpha: 0.8,
      fogFactor: 0.5,
      waterfalls: waterfalls0,
      rivers: rivers0,
      fantasyFeatures: fantasy0
    });

    // Layer 1: Mid Mountains & Waterfalls (depth = 0.5)
    const { entryHeight: eH1, exitHeight: xH1 } = resolveChunkHeights(
      seed,
      1,
      chunkX,
      viewportHeight * 0.6,
      60
    );
    const pts1 = generateLayerPoints(seed, 1, chunkX, chunkWidth, eH1, xH1, zone);
    const waterfalls1: WaterfallSpec[] = [];
    const rivers1: RiverSpec[] = [];
    const fantasy1: FantasyFeatureSpec[] = [];

    const layer1PRNG = createMulberry32(hashChunkSeed(seed, 1, chunkX));
    // Waterfalls spawn where high ledge exists
    if (zone === "mountain" || zone === "valley") {
      const ledgeIndex = Math.floor(pts1.length * (0.3 + layer1PRNG() * 0.4));
      const topPoint = pts1[ledgeIndex];
      waterfalls1.push({
        x: topPoint.x,
        topY: topPoint.y,
        bottomY: topPoint.y + 70 + layer1PRNG() * 50,
        width: 12 + layer1PRNG() * 10,
        alpha: 0.85
      });
    }

    // Giant Tree feature
    if (layer1PRNG() < 0.25 * fantasyDensity) {
      fantasy1.push({
        type: "giant_tree",
        x: chunkX * chunkWidth + chunkWidth * (0.3 + layer1PRNG() * 0.4),
        y: pts1[Math.floor(pts1.length / 2)].y - 30,
        scale: 0.9 + layer1PRNG() * 0.3,
        alpha: 0.95,
        colorToken: config.theme.hills
      });
    }

    layers.push({
      id: `mid_mountains_chunk_${chunkX}`,
      name: "Mid Mountains",
      depth: 0.5,
      points: pts1,
      fillColorToken: config.theme.mountainMid,
      strokeColorToken: config.theme.waterfall,
      alpha: 0.9,
      fogFactor: 0.25,
      waterfalls: waterfalls1,
      rivers: rivers1,
      fantasyFeatures: fantasy1
    });

    // Layer 2: Hills & River (depth = 0.8)
    const { entryHeight: eH2, exitHeight: xH2 } = resolveChunkHeights(
      seed,
      2,
      chunkX,
      viewportHeight * 0.75,
      40
    );
    const pts2 = generateLayerPoints(seed, 2, chunkX, chunkWidth, eH2, xH2, zone);
    const rivers2: RiverSpec[] = [];

    // Rivers follow low elevation points
    if (zone === "valley" || zone === "lake" || zone === "plain") {
      const riverPoints: BackdropPoint[] = pts2.map((p) => ({
        x: p.x,
        y: p.y + 15
      }));
      rivers2.push({
        path: riverPoints,
        width: zone === "lake" ? 35 : 20,
        colorToken: config.theme.river
      });
    }

    layers.push({
      id: `hills_chunk_${chunkX}`,
      name: "Hills and Rivers",
      depth: 0.8,
      points: pts2,
      fillColorToken: config.theme.hills,
      strokeColorToken: config.theme.accentGlow,
      alpha: 1.0,
      fogFactor: 0.05,
      waterfalls: [],
      rivers: rivers2,
      fantasyFeatures: []
    });

    chunks.push({
      chunkX,
      macroZone: zone,
      entryHeight: eH0,
      exitHeight: xH0,
      layers
    });
  }

  // Playfield mask default or user config
  const maskConfig = config.playfieldMask ?? {
    enabled: false,
    x: 0,
    y: 0,
    width: viewportWidth,
    height: viewportHeight,
    opacity: 0.3,
    colorToken: config.theme.maskColor ?? "#000000"
  };

  return {
    seed,
    viewportWidth,
    viewportHeight,
    chunkWidth,
    quality,
    theme: config.theme,
    playfieldMask: maskConfig,
    skyFeatures,
    chunks,
    particles
  };
}
