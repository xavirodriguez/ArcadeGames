import type { CoreComponentRegistry, World } from "@tiny-aster/core";
import type { IDrawAdapter } from "./DrawAdapter";
import type { SharedVFXPrimitiveName } from "./JuiceOrchestrator";
import {
  resolveVFXSemanticColor,
  VFX_VISUAL_PROFILES,
  type VFXEffectDescriptor,
  type VFXFamily,
  type VFXSemanticTokens,
  type VFXVisualProfileId
} from "./VFXEffectIR";
import {
  drawPixelFxBrickShatter,
  drawPixelFxDust,
  drawPixelFxExplosion,
  drawPixelFxFlapGust,
  drawPixelFxHop,
  drawPixelFxImpact,
  drawPixelFxInkBurst,
  drawPixelFxMuzzle,
  drawPixelFxPaddleImpact,
  drawPixelFxPhaseDash,
  drawPixelFxPickup,
  drawPixelFxShieldCrack,
  drawPixelFxSlash
} from "./PixelFxProceduralVFX";

export type VFXLabDrawer = (
  adapter: IDrawAdapter,
  world: World<CoreComponentRegistry>,
  entity: number
) => void;

export interface VFXLabEffect {
  readonly id: Extract<SharedVFXPrimitiveName, `pixelfx_${string}`>;
  readonly label: string;
  readonly family: VFXFamily;
  readonly draw: VFXLabDrawer;
}

/** The Visual Lab catalog is a view over production drawers, never a second renderer registry. */
export const VFX_LAB_EFFECTS = [
  { id: "pixelfx_impact", label: "Impact", family: "combat", draw: drawPixelFxImpact },
  { id: "pixelfx_slash", label: "Slash", family: "combat", draw: drawPixelFxSlash },
  { id: "pixelfx_explosion", label: "Explosion", family: "combat", draw: drawPixelFxExplosion },
  { id: "pixelfx_dust", label: "Dust", family: "traversal", draw: drawPixelFxDust },
  { id: "pixelfx_pickup", label: "Pickup", family: "interaction", draw: drawPixelFxPickup },
  { id: "pixelfx_muzzle", label: "Muzzle", family: "combat", draw: drawPixelFxMuzzle },
  { id: "pixelfx_shield_crack", label: "Shield Crack", family: "combat", draw: drawPixelFxShieldCrack },
  { id: "pixelfx_ink_burst", label: "Ink Burst", family: "combat", draw: drawPixelFxInkBurst },
  { id: "pixelfx_paddle_impact", label: "Paddle Impact", family: "combat", draw: drawPixelFxPaddleImpact },
  { id: "pixelfx_brick_shatter", label: "Brick Shatter", family: "combat", draw: drawPixelFxBrickShatter },
  { id: "pixelfx_flap_gust", label: "Flap Gust", family: "traversal", draw: drawPixelFxFlapGust },
  { id: "pixelfx_hop", label: "Hop", family: "traversal", draw: drawPixelFxHop },
  { id: "pixelfx_phase_dash", label: "Phase Dash", family: "traversal", draw: drawPixelFxPhaseDash }
] as const satisfies readonly VFXLabEffect[];

export type VFXLabEffectId = (typeof VFX_LAB_EFFECTS)[number]["id"];
export type VFXLabSemanticRole = keyof VFXSemanticTokens;

export interface VFXLabPreset {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly label: string;
  readonly effect: VFXLabEffectId;
  readonly profile: VFXVisualProfileId;
  readonly progress: number;
  readonly size: number;
  readonly rotation: number;
  /** Stable scenario metadata; production drawers are deterministic and do not consume RNG. */
  readonly seed: number;
}

export interface VFXLabSettings {
  readonly effect: VFXLabEffectId;
  readonly profile: VFXVisualProfileId;
  readonly progress: number;
  readonly size: number;
  readonly rotation: number;
  readonly seed: number;
}

export const VFX_LAB_PRESETS: readonly VFXLabPreset[] = [
  { schemaVersion: 1, id: "impact-neon", label: "Impact / Neon", effect: "pixelfx_impact", profile: "arcade-neon", progress: 0.28, size: 48, rotation: 0, seed: 104729 },
  { schemaVersion: 1, id: "ink-burst-sumi", label: "Ink Burst / Sumi-e", effect: "pixelfx_ink_burst", profile: "sumi-e", progress: 0.62, size: 60, rotation: 0.35, seed: 130363 },
  { schemaVersion: 1, id: "phase-dash-neon", label: "Phase Dash", effect: "pixelfx_phase_dash", profile: "arcade-neon", progress: 0.18, size: 42, rotation: -0.45, seed: 155921 },
  { schemaVersion: 1, id: "hop-sumi", label: "Hop / Sumi-e", effect: "pixelfx_hop", profile: "sumi-e", progress: 0.4, size: 38, rotation: -1.2, seed: 196613 }
];

const SEMANTIC_ROLE_BY_FAMILY: Record<VFXFamily, VFXLabSemanticRole> = {
  combat: "warning",
  traversal: "energy",
  interaction: "reward",
  temporal: "accent"
};

export function getVFXLabEffect(id: VFXLabEffectId): VFXLabEffect {
  const effect = VFX_LAB_EFFECTS.find((candidate) => candidate.id === id);
  if (!effect) throw new Error(`Unknown VFX Lab effect: ${id}`);
  return effect;
}

export function createVFXLabDescriptor(
  effect: VFXLabEffect,
  profile: VFXVisualProfileId,
  rotation: number
): VFXEffectDescriptor {
  const base = { id: `visual-lab:${effect.id}`, primitive: effect.id, profile };
  switch (effect.family) {
    case "combat":
      return { ...base, family: "combat", context: { direction: rotation, impactX: 0, impactY: 0, material: "energy" } };
    case "traversal":
      return { ...base, family: "traversal", context: { velocityX: Math.cos(rotation), velocityY: Math.sin(rotation), surface: "air", phase: "dash" } };
    case "interaction":
      return { ...base, family: "interaction", context: { medium: "pickup" } };
    case "temporal":
      return { ...base, family: "temporal", context: { phase: "hold", focalX: 0, focalY: 0 } };
    default: {
      const exhaustive: never = effect.family;
      throw new Error(`Unsupported VFX family: ${String(exhaustive)}`);
    }
  }
}

export function resolveVFXLabSemanticRole(family: VFXFamily): VFXLabSemanticRole {
  return SEMANTIC_ROLE_BY_FAMILY[family];
}

export function resolveVFXLabColor(
  effect: VFXLabEffect,
  profile: VFXVisualProfileId
): string {
  return resolveVFXSemanticColor(VFX_VISUAL_PROFILES[profile], effect.family);
}

export function createVFXLabPreset(label: string, settings: VFXLabSettings, id?: string): VFXLabPreset {
  const normalizedId = id ?? label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!normalizedId) throw new Error("Preset id must not be empty");
  return { schemaVersion: 1, id: normalizedId, label: label.trim() || normalizedId, ...settings };
}

export function serializeVFXLabPreset(preset: VFXLabPreset): string {
  return JSON.stringify(preset, null, 2);
}

/** Strict import: unknown effects, unsupported schema and non-finite/out-of-range values are rejected. */
export function parseVFXLabPreset(serialized: string): VFXLabPreset {
  const value: unknown = JSON.parse(serialized);
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Preset must be a JSON object");
  const candidate = value as Record<string, unknown>;
  const allowedKeys = new Set(["schemaVersion", "id", "label", "effect", "profile", "progress", "size", "rotation", "seed"]);
  if (Object.keys(candidate).some((key) => !allowedKeys.has(key))) throw new Error("Preset contains unknown fields");
  const effectExists = VFX_LAB_EFFECTS.some((effect) => effect.id === candidate.effect);
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.id !== "string" || !candidate.id.trim() ||
    typeof candidate.label !== "string" || !candidate.label.trim() ||
    !effectExists ||
    (candidate.profile !== "arcade-neon" && candidate.profile !== "sumi-e") ||
    typeof candidate.progress !== "number" || !Number.isFinite(candidate.progress) || candidate.progress < 0 || candidate.progress > 0.99 ||
    typeof candidate.size !== "number" || !Number.isFinite(candidate.size) || candidate.size < 12 || candidate.size > 100 ||
    typeof candidate.rotation !== "number" || !Number.isFinite(candidate.rotation) ||
    typeof candidate.seed !== "number" || !Number.isInteger(candidate.seed) || candidate.seed < 0 || candidate.seed > 0xffffffff
  ) {
    throw new Error("Preset fields are invalid or unsupported (schemaVersion 1)");
  }
  return candidate as unknown as VFXLabPreset;
}
