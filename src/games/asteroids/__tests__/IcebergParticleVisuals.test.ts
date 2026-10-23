import { World } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { drawIcebergParticle } from "../mods/iceberg/IcebergParticleVisuals";
import { ICEBERG_PALETTE } from "../mods/iceberg/IcebergPalette";
import { spawnIceShardFracture } from "../mods/iceberg/IcebergFracture";

const createMockContext = () => {
  const drawCalls: string[] = [];
  const ctx = {
    save() {
      drawCalls.push("save");
    },
    restore() {
      drawCalls.push("restore");
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
    stroke() {
      drawCalls.push("stroke");
    },
    rotate() {
      drawCalls.push("rotate");
    },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1
  } as never as CanvasRenderingContext2D;
  return { ctx, drawCalls };
};

describe("Iceberg particle polish (Phase 4)", () => {
  it("draws a diamond shard without Math.random", () => {
    const world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
    const original = Math.random;
    Math.random = jest.fn(() => {
      throw new Error("Math.random in particle drawer");
    });

    try {
      const entity = world.createEntity();
      world.addComponent(entity, {
        type: "Render",
        shape: "particle",
        size: 4,
        color: ICEBERG_PALETTE.iceLight,
        visible: true,
        opacity: 1,
        order: 10,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      } as never);
      world.addComponent(entity, {
        type: "Velocity",
        vx: 10,
        vy: 5,
        angularVelocity: 0
      } as never);

      const { ctx, drawCalls } = createMockContext();
      drawIcebergParticle.draw(ctx, world, entity);

      expect(drawCalls).toContain("save");
      expect(drawCalls).toContain("fill");
      expect(drawCalls).toContain("rotate");
    } finally {
      Math.random = original;
    }
  });

  it("fracture spawns ring + shards", () => {
    const world = new World();
    const acquired: Array<{ color: string }> = [];
    world.setResource("ParticlePool", {
      acquire: (_w: unknown, params: { color: string }) => {
        acquired.push({ color: params.color });
        return acquired.length;
      }
    });
    Object.assign(world.gameplayRandom, { next: () => 0.4, nextInt: () => 0, nextRange: (a: number) => a });

    spawnIceShardFracture(world as never, 0, 0, "large");

    expect(acquired.some((a) => a.color === ICEBERG_PALETTE.thermalBeam)).toBe(true);
    expect(acquired.some((a) => a.color === ICEBERG_PALETTE.hudText)).toBe(true);
    expect(acquired.length).toBeGreaterThan(20);
  });
});
