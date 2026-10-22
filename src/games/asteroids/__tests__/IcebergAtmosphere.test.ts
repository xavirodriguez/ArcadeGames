import { World } from "@tiny-aster/core";
import { PolarOceanBackgroundEffect, GeometricAuroraBackgroundEffect } from "../mods/iceberg/IcebergBackground";
import { spawnIceShardFracture } from "../mods/iceberg/IcebergFracture";
import { ICEBERG_PALETTE } from "../mods/iceberg/IcebergPalette";
import { icebergMod } from "../mods/iceberg/IcebergMod";
import { createThemeFromGameAccents } from "../../../theme/gameAccents";

const createMockContext = () => {
  const drawCalls: string[] = [];
  const ctx = {
    canvas: { width: 800, height: 600 },
    save() {
      drawCalls.push("save");
    },
    restore() {
      drawCalls.push("restore");
    },
    fillRect() {
      drawCalls.push("fillRect");
    },
    beginPath() {
      drawCalls.push("beginPath");
    },
    moveTo() {
      drawCalls.push("moveTo");
    },
    lineTo() {
      drawCalls.push("lineTo");
    },
    closePath() {
      drawCalls.push("closePath");
    },
    fill() {
      drawCalls.push("fill");
    },
    fillStyle: "",
    globalAlpha: 1
  } as unknown as CanvasRenderingContext2D;
  return { ctx, drawCalls };
};

describe("Iceberg atmosphere (Phase 3)", () => {
  it("polar ocean fills when iceberg theme is active", () => {
    const world = new World();
    world.setResource("Theme", icebergMod.createTheme(createThemeFromGameAccents("asteroids")));
    (world as { tick: number }).tick = 12;

    const { ctx, drawCalls } = createMockContext();
    PolarOceanBackgroundEffect.draw(ctx, world as never);

    expect(drawCalls).toContain("fillRect");
    expect((ctx as { fillStyle: string }).fillStyle === ICEBERG_PALETTE.oceanBase || drawCalls.includes("fillRect")).toBe(
      true
    );
  });

  it("aurora draws polygonal ribbons", () => {
    const world = new World();
    world.setResource("Theme", icebergMod.createTheme(createThemeFromGameAccents("asteroids")));
    (world as { tick: number }).tick = 40;

    const { ctx, drawCalls } = createMockContext();
    GeometricAuroraBackgroundEffect.draw(ctx, world as never);

    expect(drawCalls).toContain("beginPath");
    expect(drawCalls).toContain("fill");
  });

  it("spawnIceShardFracture is a no-op without ParticlePool", () => {
    const world = new World();
    expect(() => spawnIceShardFracture(world as never, 100, 100, "medium")).not.toThrow();
  });

  it("spawnIceShardFracture acquires particles when pool exists", () => {
    const world = new World();
    const acquired: Array<{ color: string }> = [];
    world.setResource("ParticlePool", {
      acquire: (_w: unknown, params: { color: string }) => {
        acquired.push({ color: params.color });
        return acquired.length;
      }
    });
    world.gameplayRandom = { next: () => 0.5, nextInt: () => 0, nextRange: (a: number) => a };

    spawnIceShardFracture(world as never, 50, 50, "large");

    expect(acquired.length).toBeGreaterThan(10);
    const colors = new Set(acquired.map((a) => a.color));
    expect(colors.has(ICEBERG_PALETTE.iceLight) || colors.has(ICEBERG_PALETTE.hudText)).toBe(true);
  });

  it("iceberg theme lists polar background layers", () => {
    const theme = icebergMod.createTheme(createThemeFromGameAccents("asteroids"));
    expect(theme.vfxProfile?.backgroundLayers).toEqual(["polar_ocean", "geometric_aurora"]);
    expect(icebergMod.particleStyle).toBe("iceShard");
  });
});
