import type { CoreComponentRegistry } from "@tiny-aster/core";
import {
  createHitRunHudPresentationData,
  type HitRunHudWorld
} from "./HitRunHudCanvas";
import {
  BELT_CAMERA_CONFIG_RESOURCE,
  BELT_CAMERA_STATE_RESOURCE
} from "../belt/BeltCameraTypes";
import { BELT_ALIVE_ENEMIES_RESOURCE } from "../belt/BeltCameraSystem";
import {
  WAVE_DIRECTOR_RESOURCE,
  WAVE_SCRIPT_RESOURCE
} from "../waves/HitRunWaveTypes";
import {
  WAVE_BANNER_RESOURCE,
  WAVE_TELEGRAPHS_RESOURCE
} from "../waves/HitRunWavePresentation";
import { HIT_RUN_SCORE_RESOURCE } from "../systems/HitRunScoreSystem";

describe("HitRun HUD snapshot projection", () => {
  test("maps ECS resources into presentation-only HUD, banner and frame snapshots", () => {
    const resources = new Map<string, unknown>([
      ["GameConfig", { viewportWidth: 1024, viewportHeight: 768 }],
      ["RunState", { collectedTemporalIds: [1, 2, 3] }],
      [WAVE_DIRECTOR_RESOURCE, { scriptId: "wave-1", totalSpawned: 5 }],
      [WAVE_SCRIPT_RESOURCE, { name: "First wave" }],
      [WAVE_BANNER_RESOURCE, { text: "CLEAR", remaining: 0.6, sub: "Area secured" }],
      [BELT_CAMERA_STATE_RESOURCE, { currentSectionIndex: 0, gateLocked: true, sectionCleared: false }],
      [BELT_CAMERA_CONFIG_RESOURCE, { sections: [{ id: "dojo" }] }],
      [BELT_ALIVE_ENEMIES_RESOURCE, 3],
      [HIT_RUN_SCORE_RESOURCE, { score: 1250, comboMultiplier: 2 }],
      [WAVE_TELEGRAPHS_RESOURCE, [{ x: 80, y: 90, lead: 0.55, remaining: 0.2 }]]
    ]);

    const world = {
      tick: 120,
      query: <K extends keyof CoreComponentRegistry & string>(...tags: K[]): ReadonlyArray<number> => {
        if (tags.length === 1 && tags[0] === "Camera2D") return [2];
        if (tags.length === 2 && tags[0] === "BeltInput" && tags[1] === "Health") return [1];
        if (tags.length === 2 && tags[0] === "PlatformerInput" && tags[1] === "Health") return [];
        return [];
      },
      getComponent: <K extends keyof CoreComponentRegistry & string>(entity: number, component: K): CoreComponentRegistry[K] | undefined => {
        if (entity === 2 && component === "Camera2D") return { isMain: true, x: 100, y: 240 } as CoreComponentRegistry[K];
        if (entity === 1 && component === "Health") return { current: 4, max: 5 } as CoreComponentRegistry[K];
        if (entity === 1 && component === "HitRunWeapon") {
          return { weaponId: "longbow", ammoCurrent: 3, ammoMax: 8, cooldownRemaining: 0.15 } as CoreComponentRegistry[K];
        }
        return undefined;
      },
      hasComponent: <K extends keyof CoreComponentRegistry & string>(_entity: number, _component: K): boolean => false,
      getResource: <T>(key: string): T | undefined => resources.get(key) as T | undefined
    } satisfies HitRunHudWorld;

    const result = createHitRunHudPresentationData(world);

    expect(result.hud).toMatchObject({
      score: 1250,
      health: { current: 4, max: 5 },
      combo: 2,
      metrics: {
        weaponId: "longbow",
        ammoCurrent: 3,
        ammoMax: 8,
        cooldownRemaining: 0.15,
        wave: {
          sectionLabel: "DOJO",
          waveName: "First wave",
          gateLocked: true,
          aliveEnemies: 3,
          totalSpawned: 5
        },
        telegraphs: [{ x: 80, y: 90, lead: 0.55, remaining: 0.2 }]
      }
    });
    expect(result.banner).toEqual({
      text: "CLEAR",
      subtext: "Area secured",
      remainingSeconds: 0.6,
      totalDurationSeconds: 2
    });
    expect(result.frame).toMatchObject({
      tick: 120,
      elapsedSeconds: 2,
      viewport: { width: 1024, height: 768, pixelRatio: 1 },
      camera: { x: 100, y: 240, zoom: 1 }
    });
  });

  test("falls back safely when optional world resources are missing", () => {
    const world = {
      tick: 0,
      query: <K extends keyof CoreComponentRegistry & string>(..._tags: K[]): ReadonlyArray<number> => [],
      getComponent: <K extends keyof CoreComponentRegistry & string>(
        _entity: number,
        _component: K
      ): CoreComponentRegistry[K] | undefined => undefined,
      hasComponent: <K extends keyof CoreComponentRegistry & string>(_entity: number, _component: K): boolean => false,
      getResource: <T>(_key: string): T | undefined => undefined
    } satisfies HitRunHudWorld;

    const result = createHitRunHudPresentationData(world);

    expect(result.hud.score).toBe(0);
    expect(result.hud.health).toBeUndefined();
    expect(result.banner).toBeUndefined();
    expect(result.frame.viewport).toEqual({ width: 800, height: 600, pixelRatio: 1 });
    expect(result.frame.camera).toEqual({
      x: 0,
      y: 0,
      zoom: 1,
      visualOffsetX: 0,
      visualOffsetY: 0
    });
  });
});
