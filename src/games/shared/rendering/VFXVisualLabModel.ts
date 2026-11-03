import type { CoreComponentRegistry, World } from "@tiny-aster/core";
import type { IDrawAdapter } from "./DrawAdapter";
import type { SharedVFXPrimitiveName } from "./JuiceOrchestrator";
import {
  resolveVFXSemanticColor,
  VFX_VISUAL_PROFILES,
  type VFXEffectDescriptor,
  type VFXFamily,
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

export function resolveVFXLabColor(
  effect: VFXLabEffect,
  profile: VFXVisualProfileId
): string {
  return resolveVFXSemanticColor(VFX_VISUAL_PROFILES[profile], effect.family);
}
