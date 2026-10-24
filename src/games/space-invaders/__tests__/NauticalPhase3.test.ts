import { World, THEME_RESOURCE_KEY } from "@tiny-aster/core";
import { aquiHayDragonesConceptPack } from "../../../theme/conceptPacks/aquiHayDragonesConceptPack";
import {
  NauticalWindSystem,
  ensureNauticalWind,
  NAUTICAL_WIND_RESOURCE,
  createDefaultWindState,
} from "../systems/NauticalWindSystem";
import {
  islandPhaseFromRatio,
  islandVisualScale,
  islandVisualAlpha,
  IslandErosionSystem,
} from "../systems/IslandErosionSystem";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

describe("Phase 3 — Nautical wind", () => {
  it("does not create wind resource without nautical theme", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    expect(ensureNauticalWind(world)).toBeNull();
  });

  it("creates and updates wind under aqui_hay_dragones theme", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    world.setResource(THEME_RESOURCE_KEY, aquiHayDragonesConceptPack);
    const wind = ensureNauticalWind(world);
    expect(wind).not.toBeNull();
    expect(wind!.force).toBeGreaterThanOrEqual(0);
    expect(world.getResource(NAUTICAL_WIND_RESOURCE)).toBe(wind);

    const entity = world.createEntity();
    world.addComponent(entity, { type: "PlayerBullet" } as any);
    world.addComponent(entity, { type: "Velocity", vx: 0, vy: -100 } as any);

    const sys = new NauticalWindSystem();
    wind!.force = 2;
    wind!.sign = 1;
    wind!.changeRemaining = 99;
    sys.update(world, 1 / 60);
    const vel = world.getComponent(entity, "Velocity");
    expect(vel!.vx).not.toBe(0);
  });

  it("createDefaultWindState has sensible defaults", () => {
    const w = createDefaultWindState();
    expect(w.force).toBe(1);
    expect([-1, 1]).toContain(w.sign);
  });
});

describe("Phase 3 — Island erosion helpers", () => {
  it("maps hp ratio to phases", () => {
    expect(islandPhaseFromRatio(1)).toBe("intact");
    expect(islandPhaseFromRatio(0.7)).toBe("chipped");
    expect(islandPhaseFromRatio(0.4)).toBe("cracked");
    expect(islandPhaseFromRatio(0.1)).toBe("sinking");
    expect(islandPhaseFromRatio(0)).toBe("gone");
  });

  it("scales and fades with ratio", () => {
    expect(islandVisualScale(1)).toBeCloseTo(1, 2);
    expect(islandVisualScale(0)).toBeLessThan(0.6);
    expect(islandVisualAlpha(1)).toBeCloseTo(1, 2);
    expect(islandVisualAlpha(0)).toBeLessThan(0.4);
  });

  it("IslandErosionSystem fades shields under nautical theme", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    world.setResource(THEME_RESOURCE_KEY, aquiHayDragonesConceptPack);
    const e = world.createEntity();
    world.addComponent(e, {
      type: "Shield",
      hp: 1,
      maxHp: 4,
      segment: { row: 0, col: 0 },
    } as any);
    world.addComponent(e, {
      type: "Render",
      shape: "shield_block",
      size: 15,
      color: "#CDB88A",
      visible: true,
      opacity: 1,
      order: 0,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    } as any);
    new IslandErosionSystem().update(world, 0);
    const r = world.getComponent(e, "Render");
    expect(r!.opacity).toBeLessThan(1);
  });
});
