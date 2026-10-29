import { World } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import {
  drawIcebergPlayerShip,
  drawIcebergAsteroid,
  drawIcebergBullet
} from "../mods/iceberg/IcebergCanvasVisuals";
import { ICEBERG_PALETTE } from "../mods/iceberg/IcebergPalette";
import { vertsForAsteroidEntity, entitySeededRandom } from "../mods/iceberg/IcebergDrawUtils";

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
    beginPath() {
      drawCalls.push("beginPath");
    },
    closePath() {
      drawCalls.push("closePath");
    },
    moveTo(x: number, y: number) {
      drawCalls.push(`moveTo:${Math.round(x)},${Math.round(y)}`);
    },
    lineTo(x: number, y: number) {
      drawCalls.push(`lineTo:${Math.round(x)},${Math.round(y)}`);
    },
    stroke() {
      drawCalls.push("stroke");
    },
    fill() {
      drawCalls.push("fill");
    },
    fillRect() {
      drawCalls.push("fillRect");
    },
    translate() {
      drawCalls.push("translate");
    },
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
    lineJoin: "",
    lineCap: ""
  } as never as CanvasRenderingContext2D & { strokeStyle: string; fillStyle: string };
  return { ctx, drawCalls };
};

describe("Iceberg Canvas visuals (Phase 2)", () => {
  let world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  let originalRandom: typeof Math.random;

  beforeEach(() => {
    world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
    world.setResource("ScreenConfig", { width: 800, height: 600 });
    originalRandom = Math.random;
    Math.random = jest.fn(() => {
      throw new Error("Math.random() in iceberg drawer violates determinism");
    });
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it("draws icebreaker without Math.random", () => {
    const { ctx, drawCalls } = createMockContext();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Render",
      shape: "player_ship",
      size: 15,
      color: ICEBERG_PALETTE.shipHull,
      visible: true,
      opacity: 1,
      order: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    } as never);
    world.addComponent(entity, {
      type: "Input",
      actions: ["thrust"],
      axes: {}
    } as never);

    drawIcebergPlayerShip.draw(ctx, world, entity);

    expect(drawCalls).toContain("save");
    expect(drawCalls).toContain("restore");
    expect(drawCalls).toContain("fill");
    expect(drawCalls).toContain("fillRect"); // thermal wake blocks
  });

  it("draws faceted iceberg without Math.random", () => {
    const { ctx, drawCalls } = createMockContext();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Render",
      shape: "asteroid",
      size: 50,
      color: ICEBERG_PALETTE.iceMid,
      visible: true,
      opacity: 1,
      order: 0,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    } as never);

    drawIcebergAsteroid.draw(ctx, world, entity);

    expect(drawCalls).toContain("beginPath");
    expect(drawCalls).toContain("fill");
    expect(drawCalls).toContain("translate"); // hard shadow
  });

  it("draws thermal beam as solid blocks", () => {
    const { ctx, drawCalls } = createMockContext();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Render",
      shape: "bullet",
      size: 2,
      color: ICEBERG_PALETTE.thermalBeam,
      visible: true,
      opacity: 1,
      order: 2,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    } as never);

    drawIcebergBullet.draw(ctx, world, entity);

    expect(drawCalls.filter((c) => c === "fillRect").length).toBeGreaterThanOrEqual(2);
  });

  it("entity-seeded verts are stable", () => {
    const a = vertsForAsteroidEntity(42, 40);
    const b = vertsForAsteroidEntity(42, 40);
    expect(a).toEqual(b);
    expect(entitySeededRandom(1)()).not.toBeNaN();
  });
});
