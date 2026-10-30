import type {
  PresentationBannerSnapshot,
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
