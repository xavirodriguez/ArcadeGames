import type {
  PresentationBannerSnapshot,
  PresentationEntitySnapshot,
  PresentationHudSnapshot,
  PresentationSceneSnapshot
} from "../../../shared/presentation/PresentationContracts";
import type { WalkableAreaGeometry } from "../../belt/WalkableAreaGeometry";

export interface HitRunPresentationHudMetrics {
  readonly weaponId: string;
  readonly ammoCurrent: number;
  readonly ammoMax: number;
  readonly cooldownRemaining: number;
  readonly wave: {
    readonly sectionLabel: string;
    readonly waveName: string;
    readonly gateLocked: boolean;
    readonly sectionCleared: boolean;
    readonly aliveEnemies: number;
    readonly totalSpawned: number;
  };
  readonly telegraphs: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
    readonly lead: number;
    readonly remaining: number;
  }>;
}

export type HitRunPresentationHudSnapshot = PresentationHudSnapshot<HitRunPresentationHudMetrics>;
export type HitRunPresentationBannerSnapshot = PresentationBannerSnapshot;

/**
 * Custom scene data that carries the walkable-area geometry derived from the
 * physical belt limits. Themes must use this (or the world resource) instead of
 * hard-coded viewport percentages so visual borders stay aligned with gameplay.
 */
export interface HitRunPresentationSceneData {
  readonly walkableArea: WalkableAreaGeometry;
}

export type HitRunPresentationSceneSnapshot =
  PresentationSceneSnapshot<HitRunPresentationSceneData>;

export interface HitRunPresentationEntityData {
  readonly size: number;
  readonly depth: number;
  readonly isDead: boolean;
  readonly samuraiState?: string;
  readonly samuraiWindup: boolean;
  readonly samuraiAttack: boolean;
  readonly shadowSizeMultiplier: number;
  readonly shadowRxRatio?: number;
  readonly shadowRyRatio?: number;
}

export type HitRunPresentationEntitySnapshot =
  PresentationEntitySnapshot<HitRunPresentationEntityData>;
