import { World, THEME_RESOURCE_KEY } from "@tiny-aster/core";
import { aquiHayDragonesConceptPack } from "../../../../../theme/conceptPacks/aquiHayDragonesConceptPack";
import {
  NauticalWindSystem,
  ensureNauticalWind,
  NAUTICAL_WIND_RESOURCE,
  createDefaultWindState,
} from "../NauticalWindSystem";
import {
  islandPhaseFromRatio,
  islandVisualScale,
  islandVisualAlpha,
  IslandErosionSystem,
} from "../IslandErosionSystem";
import { SpaceInvadersComponentRegistry } from "../../../types/SpaceInvadersTypes";

describe("Phase 3 — Nautical wind", () => {
  it("creates wind resource on ensureNauticalWind when requested by NauticalMod", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    const wind = ensureNauticalWind(world);
    expect(wind).not.toBeNull();
    expect(world.getResource(NAUTICAL_WIND_RESOURCE)).toBe(wind);
  });

  it("creates and updates wind under aqui_hay_dragones theme", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    world.setResource(THEME_RESOURCE_KEY, aquiHayDragonesConceptPack);
    const wind = ensureNauticalWind(world);
    expect(wind).not.toBeNull();
    expect(wind!.force).toBeGreaterThanOrEqual(0);
    expect(world.getResource(NAUTICAL_WIND_RESOURCE)).toBe(wind);

    const entity = world.createEntity();
    world.addComponent(entity, { type: "PlayerBullet" });
    world.addComponent(entity, { type: "Velocity", vx: 0, vy: -100, angularVelocity: 0 });

    const sys = new NauticalWindSystem();
    wind!.force = 2;
    wind!.sign = 1;
    wind!.changeRemaining = 99;
    sys.update(world, 1 / 60);
    const vel = world.getComponent(entity, "Velocity");
    expect(vel!.vx).not.toBe(0);
  });

  it("uses the seeded gameplay random source when wind changes", () => {
    const world = new World<SpaceInvadersComponentRegistry>();
    const wind = ensureNauticalWind(world);
    wind.changeRemaining = 0;

    const next = jest.spyOn(world.gameplayRandom, "next")
      .mockReturnValueOnce(0.75)
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.5);
    const randomSpy = jest.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Nautical wind must not use Math.random()");
    });

    try {
      new NauticalWindSystem().update(world, 0);
      expect(wind.force).toBe(3);
      expect(wind.sign).toBe(-1);
      expect(wind.changeRemaining).toBe(7);
      expect(next).toHaveBeenCalledTimes(3);
    } finally {
      randomSpy.mockRestore();
      next.mockRestore();
    }
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
    });
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
    });
    new IslandErosionSystem().update(world, 0);
    const r = world.getComponent(e, "Render");
    expect(r!.opacity).toBeLessThan(1);
  });
});
