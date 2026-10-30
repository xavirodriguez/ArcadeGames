import type {
  PresentationBannerSnapshot,
  PresentationEntitySnapshot,
  PresentationHudSnapshot
} from "../../../shared/presentation/PresentationContracts";

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
