import type { CoreComponentRegistry, World } from "@tiny-aster/core";
import type { IDrawAdapter } from "./DrawAdapter";
import type { SharedVFXPrimitiveName } from "./JuiceOrchestrator";
import {
  resolveVFXSemanticColor,
  VFX_VISUAL_PROFILES,
  type VFXEffectDescriptor,
  type VFXFamily,
  type VFXSemanticTokens,
  type VFXVisualProfileId,
  type TraversalVFXContext
} from "./VFXEffectIR";
import {
  drawPixelFxBrickShatter,
  drawPixelFxDust,
  drawPixelFxExplosion,
  drawPixelFxFlapGust,
  drawPixelFxHop,
  drawPixelFxImpact,
  drawPixelFxHitstun,
  drawPixelFxStagger,
  drawPixelFxInkBurst,
  drawPixelFxMuzzle,
  drawPixelFxPaddleImpact,
  drawPixelFxPhaseDash,
  drawPixelFxPickup,
  drawPixelFxRicochet,
  drawPixelFxCharge,
  drawPixelFxShieldPulse,
  drawPixelFxTargetWarning,
  drawPixelFxTeleport,
  drawPixelFxSurfaceSkid,
  drawPixelFxMechanicalMotion,
  drawPixelFxParry,
  drawPixelFxPerfectBlock,
  drawPixelFxCriticalHit,
  drawPixelFxProjectileDeflection,
  drawPixelFxGuardBreak,
  drawPixelFxArmorBreak,
  drawPixelFxComboFinisher,
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
  { id: "pixelfx_hitstun", label: "Hitstun", family: "combat", draw: drawPixelFxHitstun },
  { id: "pixelfx_stagger", label: "Stagger", family: "combat", draw: drawPixelFxStagger },
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
  { id: "pixelfx_phase_dash", label: "Phase Dash", family: "traversal", draw: drawPixelFxPhaseDash },
  { id: "pixelfx_ricochet", label: "Ricochet", family: "combat", draw: drawPixelFxRicochet },
  { id: "pixelfx_charge", label: "Charge", family: "combat", draw: drawPixelFxCharge },
  { id: "pixelfx_shield_pulse", label: "Shield Pulse", family: "combat", draw: drawPixelFxShieldPulse },
  { id: "pixelfx_parry", label: "Parry", family: "combat", draw: drawPixelFxParry },
  { id: "pixelfx_perfect_block", label: "Perfect Block", family: "combat", draw: drawPixelFxPerfectBlock },
  { id: "pixelfx_critical_hit", label: "Critical Hit", family: "combat", draw: drawPixelFxCriticalHit },
  { id: "pixelfx_projectile_deflection", label: "Projectile Deflection", family: "combat", draw: drawPixelFxProjectileDeflection },
  { id: "pixelfx_guard_break", label: "Guard Break", family: "combat", draw: drawPixelFxGuardBreak },
  { id: "pixelfx_armor_break", label: "Armor Break", family: "combat", draw: drawPixelFxArmorBreak },
  { id: "pixelfx_combo_finisher", label: "Combo Finisher", family: "combat", draw: drawPixelFxComboFinisher },
  { id: "pixelfx_target_warning", label: "Target Warning", family: "combat", draw: drawPixelFxTargetWarning },
  { id: "pixelfx_teleport", label: "Teleport", family: "traversal", draw: drawPixelFxTeleport },
  { id: "pixelfx_surface_skid", label: "Surface Skid", family: "traversal", draw: drawPixelFxSurfaceSkid },
  { id: "pixelfx_mechanical_motion", label: "Mechanical Motion", family: "traversal", draw: drawPixelFxMechanicalMotion }
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

export const VFX_COMBAT_QUALITY_EFFECT_IDS = [
  "pixelfx_impact",
  "pixelfx_hitstun",
  "pixelfx_stagger",
  "pixelfx_guard_break",
  "pixelfx_armor_break",
  "pixelfx_ricochet"
] as const;

export const VFX_COMBAT_QUALITY_PHASES = [
  { id: "contact", label: "Contact", progress: 0.04 },
  { id: "expansion", label: "Expansion", progress: 0.28 },
  { id: "peak", label: "Peak", progress: 0.58 },
  { id: "dissipation", label: "Dissipation", progress: 0.88 }
] as const;

export const VFX_LAB_PRESETS: readonly VFXLabPreset[] = [
  { schemaVersion: 1, id: "impact-neon", label: "Impact / Neon", effect: "pixelfx_impact", profile: "arcade-neon", progress: 0.28, size: 48, rotation: 0, seed: 104729 },
  { schemaVersion: 1, id: "ink-burst-sumi", label: "Ink Burst / Sumi-e", effect: "pixelfx_ink_burst", profile: "sumi-e", progress: 0.62, size: 60, rotation: 0.35, seed: 130363 },
  { schemaVersion: 1, id: "phase-dash-neon", label: "Phase Dash", effect: "pixelfx_phase_dash", profile: "arcade-neon", progress: 0.18, size: 42, rotation: -0.45, seed: 155921 },
  { schemaVersion: 1, id: "hop-sumi", label: "Hop / Sumi-e", effect: "pixelfx_hop", profile: "sumi-e", progress: 0.4, size: 38, rotation: -1.2, seed: 196613 },
  { schemaVersion: 1, id: "ricochet-neon", label: "Ricochet / Neon", effect: "pixelfx_ricochet", profile: "arcade-neon", progress: 0.34, size: 46, rotation: -0.62, seed: 223117 },
  { schemaVersion: 1, id: "charge-neon", label: "Charge / Neon", effect: "pixelfx_charge", profile: "arcade-neon", progress: 0.22, size: 54, rotation: 0, seed: 246271 },
  { schemaVersion: 1, id: "shield-pulse-sumi", label: "Shield Pulse / Sumi-e", effect: "pixelfx_shield_pulse", profile: "sumi-e", progress: 0.42, size: 58, rotation: 0.3, seed: 270371 },
  { schemaVersion: 1, id: "parry-neon", label: "Parry / Neon", effect: "pixelfx_parry", profile: "arcade-neon", progress: 0.36, size: 56, rotation: -0.35, seed: 281117 },
  { schemaVersion: 1, id: "perfect-block-neon", label: "Perfect Block / Neon", effect: "pixelfx_perfect_block", profile: "arcade-neon", progress: 0.22, size: 58, rotation: 0.18, seed: 301111 },
  { schemaVersion: 1, id: "critical-hit-neon", label: "Critical Hit / Neon", effect: "pixelfx_critical_hit", profile: "arcade-neon", progress: 0.32, size: 62, rotation: -0.2, seed: 313337 },
  { schemaVersion: 1, id: "projectile-deflection-sumi", label: "Projectile Deflection / Sumi-e", effect: "pixelfx_projectile_deflection", profile: "sumi-e", progress: 0.46, size: 58, rotation: -0.35, seed: 327673 },
  { schemaVersion: 1, id: "guard-break-neon", label: "Guard Break / Neon", effect: "pixelfx_guard_break", profile: "arcade-neon", progress: 0.42, size: 62, rotation: -0.2, seed: 337117 },
  { schemaVersion: 1, id: "armor-break-sumi", label: "Armor Break / Sumi-e", effect: "pixelfx_armor_break", profile: "sumi-e", progress: 0.56, size: 64, rotation: 0.28, seed: 349921 },
  { schemaVersion: 1, id: "combo-finisher-neon", label: "Combo Finisher / Neon", effect: "pixelfx_combo_finisher", profile: "arcade-neon", progress: 0.48, size: 68, rotation: -0.42, seed: 361003 },
  { schemaVersion: 1, id: "target-warning-neon", label: "Target Warning / Neon", effect: "pixelfx_target_warning", profile: "arcade-neon", progress: 0.18, size: 50, rotation: 0.18, seed: 293867 },
  { schemaVersion: 1, id: "teleport-neon", label: "Teleport / Neon", effect: "pixelfx_teleport", profile: "arcade-neon", progress: 0.46, size: 56, rotation: 0.3, seed: 318137 },
  { schemaVersion: 1, id: "surface-skid-sumi", label: "Surface Skid / Sumi-e", effect: "pixelfx_surface_skid", profile: "sumi-e", progress: 0.38, size: 52, rotation: 0.12, seed: 342347 },
  { schemaVersion: 1, id: "mechanical-motion-neon", label: "Mechanical Motion / Neon", effect: "pixelfx_mechanical_motion", profile: "arcade-neon", progress: 0.32, size: 58, rotation: -0.2, seed: 366013 },
  { schemaVersion: 1, id: "pickup-neon", label: "Pickup / Neon", effect: "pixelfx_pickup", profile: "arcade-neon", progress: 0.35, size: 44, rotation: 0, seed: 389423 },
  { schemaVersion: 1, id: "pickup-sumi", label: "Pickup / Sumi-e", effect: "pixelfx_pickup", profile: "sumi-e", progress: 0.48, size: 46, rotation: 0.25, seed: 412807 },
  { schemaVersion: 1, id: "paddle-impact-neon", label: "Paddle Impact / Neon", effect: "pixelfx_paddle_impact", profile: "arcade-neon", progress: 0.25, size: 50, rotation: 1.57, seed: 436219 },
  { schemaVersion: 1, id: "brick-shatter-sumi", label: "Brick Shatter / Sumi-e", effect: "pixelfx_brick_shatter", profile: "sumi-e", progress: 0.52, size: 54, rotation: -0.35, seed: 459673 },
  { schemaVersion: 1, id: "muzzle-neon", label: "Muzzle / Neon", effect: "pixelfx_muzzle", profile: "arcade-neon", progress: 0.2, size: 40, rotation: 0, seed: 483161 },
  { schemaVersion: 1, id: "shield-crack-sumi", label: "Shield Crack / Sumi-e", effect: "pixelfx_shield_crack", profile: "sumi-e", progress: 0.44, size: 56, rotation: -0.15, seed: 506689 },
  { schemaVersion: 1, id: "hitstun-neon", label: "Hitstun / Neon", effect: "pixelfx_hitstun", profile: "arcade-neon", progress: 0.3, size: 44, rotation: 0.08, seed: 521003 },
  { schemaVersion: 1, id: "stagger-neon", label: "Stagger / Neon", effect: "pixelfx_stagger", profile: "arcade-neon", progress: 0.46, size: 58, rotation: -0.22, seed: 532181 },
  { schemaVersion: 1, id: "slash-neon", label: "Slash / Neon", effect: "pixelfx_slash", profile: "arcade-neon", progress: 0.38, size: 52, rotation: -0.62, seed: 543217 },
  { schemaVersion: 1, id: "explosion-neon", label: "Explosion / Neon", effect: "pixelfx_explosion", profile: "arcade-neon", progress: 0.32, size: 66, rotation: 0.16, seed: 554323 },
  { schemaVersion: 1, id: "dust-sumi", label: "Dust / Sumi-e", effect: "pixelfx_dust", profile: "sumi-e", progress: 0.52, size: 46, rotation: 0.12, seed: 565399 },
  { schemaVersion: 1, id: "flap-gust-sumi", label: "Flap Gust / Sumi-e", effect: "pixelfx_flap_gust", profile: "sumi-e", progress: 0.34, size: 48, rotation: -0.48, seed: 576481 },
  { schemaVersion: 1, id: "impact-contact", label: "impact / Contact", effect: "pixelfx_impact", profile: "arcade-neon", progress: 0.04, size: 48, rotation: 0, seed: 610001 },
  { schemaVersion: 1, id: "impact-expansion", label: "impact / Expansion", effect: "pixelfx_impact", profile: "arcade-neon", progress: 0.28, size: 48, rotation: 0, seed: 610001 },
  { schemaVersion: 1, id: "impact-peak", label: "impact / Peak", effect: "pixelfx_impact", profile: "arcade-neon", progress: 0.58, size: 48, rotation: 0, seed: 610001 },
  { schemaVersion: 1, id: "impact-dissipation", label: "impact / Dissipation", effect: "pixelfx_impact", profile: "arcade-neon", progress: 0.88, size: 48, rotation: 0, seed: 610001 },
  { schemaVersion: 1, id: "hitstun-contact", label: "hitstun / Contact", effect: "pixelfx_hitstun", profile: "arcade-neon", progress: 0.04, size: 44, rotation: 0.08, seed: 620003 },
  { schemaVersion: 1, id: "hitstun-expansion", label: "hitstun / Expansion", effect: "pixelfx_hitstun", profile: "arcade-neon", progress: 0.28, size: 44, rotation: 0.08, seed: 620003 },
  { schemaVersion: 1, id: "hitstun-peak", label: "hitstun / Peak", effect: "pixelfx_hitstun", profile: "arcade-neon", progress: 0.58, size: 44, rotation: 0.08, seed: 620003 },
  { schemaVersion: 1, id: "hitstun-dissipation", label: "hitstun / Dissipation", effect: "pixelfx_hitstun", profile: "arcade-neon", progress: 0.88, size: 44, rotation: 0.08, seed: 620003 },
  { schemaVersion: 1, id: "stagger-contact", label: "stagger / Contact", effect: "pixelfx_stagger", profile: "arcade-neon", progress: 0.04, size: 58, rotation: -0.22, seed: 630007 },
  { schemaVersion: 1, id: "stagger-expansion", label: "stagger / Expansion", effect: "pixelfx_stagger", profile: "arcade-neon", progress: 0.28, size: 58, rotation: -0.22, seed: 630007 },
  { schemaVersion: 1, id: "stagger-peak", label: "stagger / Peak", effect: "pixelfx_stagger", profile: "arcade-neon", progress: 0.58, size: 58, rotation: -0.22, seed: 630007 },
  { schemaVersion: 1, id: "stagger-dissipation", label: "stagger / Dissipation", effect: "pixelfx_stagger", profile: "arcade-neon", progress: 0.88, size: 58, rotation: -0.22, seed: 630007 },
  { schemaVersion: 1, id: "guard-break-contact", label: "guard break / Contact", effect: "pixelfx_guard_break", profile: "arcade-neon", progress: 0.04, size: 62, rotation: -0.2, seed: 640009 },
  { schemaVersion: 1, id: "guard-break-expansion", label: "guard break / Expansion", effect: "pixelfx_guard_break", profile: "arcade-neon", progress: 0.28, size: 62, rotation: -0.2, seed: 640009 },
  { schemaVersion: 1, id: "guard-break-peak", label: "guard break / Peak", effect: "pixelfx_guard_break", profile: "arcade-neon", progress: 0.58, size: 62, rotation: -0.2, seed: 640009 },
  { schemaVersion: 1, id: "guard-break-dissipation", label: "guard break / Dissipation", effect: "pixelfx_guard_break", profile: "arcade-neon", progress: 0.88, size: 62, rotation: -0.2, seed: 640009 },
  { schemaVersion: 1, id: "armor-break-contact", label: "armor break / Contact", effect: "pixelfx_armor_break", profile: "sumi-e", progress: 0.04, size: 64, rotation: 0.28, seed: 650011 },
  { schemaVersion: 1, id: "armor-break-expansion", label: "armor break / Expansion", effect: "pixelfx_armor_break", profile: "sumi-e", progress: 0.28, size: 64, rotation: 0.28, seed: 650011 },
  { schemaVersion: 1, id: "armor-break-peak", label: "armor break / Peak", effect: "pixelfx_armor_break", profile: "sumi-e", progress: 0.58, size: 64, rotation: 0.28, seed: 650011 },
  { schemaVersion: 1, id: "armor-break-dissipation", label: "armor break / Dissipation", effect: "pixelfx_armor_break", profile: "sumi-e", progress: 0.88, size: 64, rotation: 0.28, seed: 650011 },
  { schemaVersion: 1, id: "ricochet-contact", label: "ricochet / Contact", effect: "pixelfx_ricochet", profile: "arcade-neon", progress: 0.04, size: 46, rotation: -0.62, seed: 660013 },
  { schemaVersion: 1, id: "ricochet-expansion", label: "ricochet / Expansion", effect: "pixelfx_ricochet", profile: "arcade-neon", progress: 0.28, size: 46, rotation: -0.62, seed: 660013 },
  { schemaVersion: 1, id: "ricochet-peak", label: "ricochet / Peak", effect: "pixelfx_ricochet", profile: "arcade-neon", progress: 0.58, size: 46, rotation: -0.62, seed: 660013 },
  { schemaVersion: 1, id: "ricochet-dissipation", label: "ricochet / Dissipation", effect: "pixelfx_ricochet", profile: "arcade-neon", progress: 0.88, size: 46, rotation: -0.62, seed: 660013 },
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
    case "traversal": {
      const phase: TraversalVFXContext["phase"] =
        effect.id === "pixelfx_teleport" ? "teleport" :
        effect.id === "pixelfx_surface_skid" ? "slide" :
        effect.id === "pixelfx_mechanical_motion" ? "mechanical" : "dash";
      const surface: TraversalVFXContext["surface"] =
        effect.id === "pixelfx_surface_skid" || effect.id === "pixelfx_mechanical_motion" ? "ground" : "air";
      return { ...base, family: "traversal", context: { velocityX: Math.cos(rotation), velocityY: Math.sin(rotation), surface, phase } };
    }
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

export interface VFXLabPreviewPalette {
  readonly background: string;
  readonly grid: string;
  readonly gridAlpha: number;
}

/** Shared stage palette keeps the Canvas and Skia comparison surfaces identical. */
export function getVFXLabPreviewPalette(profile: VFXVisualProfileId): VFXLabPreviewPalette {
  return profile === "sumi-e"
    ? { background: "#E7DFCB", grid: "#77736B", gridAlpha: 0.12 }
    : { background: "#070B13", grid: "#26364D", gridAlpha: 0.18 };
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
  return candidate as never as VFXLabPreset;
}
