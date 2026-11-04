import type { SharedVFXPrimitiveName } from "./JuiceOrchestrator";
import { colors } from "../../../theme/colors";
import { SUMI_E_SEMANTIC_TOKENS } from "../../../theme/sumi-e";

/** Gameplay meaning carried to presentation without transferring gameplay authority. */
export type VFXFamily = "combat" | "traversal" | "interaction" | "temporal";
export type VFXVisualProfileId = "arcade-neon" | "sumi-e";

export interface CombatVFXContext {
  readonly direction?: number;
  readonly intensity?: number;
  readonly impactX?: number;
  readonly impactY?: number;
  readonly material?: "metal" | "stone" | "wood" | "energy" | "organic";
  readonly sourceEntity?: number;
  readonly targetEntity?: number;
}

export interface TraversalVFXContext {
  readonly velocityX: number;
  readonly velocityY: number;
  readonly surface?: "ground" | "ice" | "water" | "wall" | "air";
  readonly phase?: "takeoff" | "landing" | "dash" | "slide" | "contact" | "teleport" | "mechanical";
}

export interface InteractionVFXContext {
  readonly sourceEntity?: number;
  readonly targetEntity?: number;
  readonly distance?: number;
  readonly medium?: "pickup" | "switch" | "magnetism" | "contact" | "interface";
}

export interface TemporalVFXContext {
  readonly phase: "enter" | "hold" | "exit";
  readonly focalX?: number;
  readonly focalY?: number;
  readonly presentationFactor?: number;
}

export interface VFXPresentationPlacement {
  readonly x?: number;
  readonly y?: number;
  readonly rotation?: number;
  readonly scale?: number;
  /** Seconds; forwarded to the existing ECS TTL component. */
  readonly ttl?: number;
}

interface VFXEffectDescriptorBase {
  readonly id: string;
  readonly primitive: SharedVFXPrimitiveName;
  readonly profile: VFXVisualProfileId;
  readonly presentation?: VFXPresentationPlacement;
}

export type VFXEffectDescriptor =
  | (VFXEffectDescriptorBase & { readonly family: "combat"; readonly context: CombatVFXContext })
  | (VFXEffectDescriptorBase & { readonly family: "traversal"; readonly context: TraversalVFXContext })
  | (VFXEffectDescriptorBase & { readonly family: "interaction"; readonly context: InteractionVFXContext })
  | (VFXEffectDescriptorBase & { readonly family: "temporal"; readonly context: TemporalVFXContext });

export interface VFXSemanticTokens {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly neutral: string;
  readonly warning: string;
  readonly energy: string;
  readonly reward: string;
}

export interface VFXVisualProfile {
  readonly id: VFXVisualProfileId;
  readonly tokens: VFXSemanticTokens;
}

export const VFX_VISUAL_PROFILES = {
  "arcade-neon": {
    id: "arcade-neon",
    tokens: {
      primary: colors.cyan,
      secondary: colors.magenta,
      accent: colors.pink,
      neutral: colors.white,
      warning: colors.danger,
      energy: colors.green,
      reward: colors.gold
    }
  },
  "sumi-e": {
    id: "sumi-e",
    tokens: {
      primary: SUMI_E_SEMANTIC_TOKENS.text.primary,
      secondary: SUMI_E_SEMANTIC_TOKENS.landscape.ink,
      accent: SUMI_E_SEMANTIC_TOKENS.ui.seal,
      neutral: SUMI_E_SEMANTIC_TOKENS.surface.paper,
      warning: SUMI_E_SEMANTIC_TOKENS.threat.glow,
      energy: SUMI_E_SEMANTIC_TOKENS.player.trail,
      reward: SUMI_E_SEMANTIC_TOKENS.reward.primary
    }
  }
} as const satisfies Record<string, VFXVisualProfile>;


function assertNever(value: never): never {
  throw new Error(`Unsupported VFX family: ${String(value)}`);
}

/** Resolve only presentation placement; family context never changes gameplay state. */
export function resolveVFXPlacement(
  descriptor: VFXEffectDescriptor
): VFXPresentationPlacement {
  switch (descriptor.family) {
    case "combat":
      return {
        x: descriptor.context.impactX,
        y: descriptor.context.impactY,
        rotation: descriptor.context.direction,
        ...descriptor.presentation
      };
    case "traversal":
      return {
        rotation:
          descriptor.context.velocityX === 0 && descriptor.context.velocityY === 0
            ? undefined
            : Math.atan2(descriptor.context.velocityY, descriptor.context.velocityX),
        ...descriptor.presentation
      };
    case "interaction":
      return { ...descriptor.presentation };
    case "temporal":
      return {
        x: descriptor.context.focalX,
        y: descriptor.context.focalY,
        ...descriptor.presentation
      };
    default:
      return assertNever(descriptor);
  }
}

/** Resolve semantic family meaning to a palette token, independent of primitive identity. */
export function resolveVFXSemanticColor(
  profile: VFXVisualProfile,
  family: VFXFamily
): string {
  switch (family) {
    case "combat":
      return profile.tokens.warning;
    case "traversal":
      return profile.tokens.energy;
    case "interaction":
      return profile.tokens.reward;
    case "temporal":
      return profile.tokens.accent;
  }
}
