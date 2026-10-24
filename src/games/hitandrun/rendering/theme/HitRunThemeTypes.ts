/**
 * Snapshot data structures for Hit & Run theme rendering.
 * Strictly read-only simulation data passed into presentation layer.
 */

export interface EntityRenderSnapshot {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
  readonly elevation: number;
  readonly facing: number;
  readonly scale: number;
  readonly animState: string;
  readonly hitFlash: number;
  readonly visualId: string;
  readonly size: number;
  readonly color?: string;
}

export interface HudPlayerSnapshot {
  readonly currentHp: number;
  readonly maxHp: number;
  readonly weaponId: string;
  readonly ammoCurrent: number;
  readonly ammoMax: number;
  readonly cooldownRemaining: number;
}

export interface HudWaveSnapshot {
  readonly sectionLabel: string;
  readonly waveName: string;
  readonly gateLocked: boolean;
  readonly sectionCleared: boolean;
  readonly aliveEnemies: number;
  readonly totalSpawned: number;
}

export interface HudScoreSnapshot {
  readonly score: number;
  readonly comboMultiplier: number;
  readonly popupPool?: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly color: string;
    readonly opacity: number;
    readonly active: boolean;
  }>;
}

export interface HudTelegraphSnapshot {
  readonly x: number;
  readonly y: number;
  readonly lead: number;
  readonly remaining: number;
}

export interface HudRenderSnapshot {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly cameraX: number;
  readonly cameraY: number;
  readonly player?: HudPlayerSnapshot;
  readonly wave?: HudWaveSnapshot;
  readonly score?: HudScoreSnapshot;
  readonly telegraphs?: ReadonlyArray<HudTelegraphSnapshot>;
  readonly isGameOver: boolean;
}

export interface BannerRenderSnapshot {
  readonly text: string;
  readonly sub?: string;
  readonly remaining: number;
  readonly totalDuration: number;
}

export interface FeedbackEventSnapshot {
  readonly type: "hit" | "death" | "explosion";
  readonly x?: number;
  readonly y?: number;
  readonly z?: number;
  readonly category?: string;
  readonly amount?: number;
  readonly facing?: number;
}
