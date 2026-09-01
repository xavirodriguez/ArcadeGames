import { World, computeShipPhysics, getForwardVector } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";
import { createShip, createBullet } from "../EntityFactory";

describe("Multi-rotation numerical regression test for thrust and bullet direction", () => {
  let game: AsteroidsGame;
  let world: World<any, any, any>;

  beforeEach(async () => {
    game = new AsteroidsGame({ headless: true });
    await game.init();
    world = game.getWorld();
  });

  afterEach(() => {
    game.destroy();
  });

  const testCases = [
    { name: "0 deg (facing +X)", rotation: 0, expectedXSign: 1, expectedYSign: 0 },
    { name: "90 deg (facing +Y)", rotation: Math.PI / 2, expectedXSign: 0, expectedYSign: 1 },
    { name: "180 deg (facing -X)", rotation: Math.PI, expectedXSign: -1, expectedYSign: 0 },
    { name: "-90 deg (facing -Y)", rotation: -Math.PI / 2, expectedXSign: 0, expectedYSign: -1 }
  ];

  test.each(testCases)(
    "verify thrust and bullet velocity directional signs match for rotation $name",
    ({ rotation, expectedXSign, expectedYSign }) => {
      // 1. Check computeShipPhysics thrust direction
      const transform = { rotation };
      const velocity = { vx: 0, vy: 0 };
      const config = { SHIP_THRUST: 100, SHIP_ROTATION_SPEED: 1.0, SHIP_FRICTION: 0 };
      const input = { actions: new Set(["thrust"]), axes: {} };

      const physResult = computeShipPhysics(transform, velocity, input, config, 1.0);

      const fVec = getForwardVector(rotation);

      if (expectedXSign === 0) {
        expect(physResult.vx).toBeCloseTo(0, 5);
        expect(fVec.x).toBeCloseTo(0, 5);
      } else if (expectedXSign > 0) {
        expect(physResult.vx).toBeGreaterThan(0);
        expect(fVec.x).toBeGreaterThan(0);
      } else {
        expect(physResult.vx).toBeLessThan(0);
        expect(fVec.x).toBeLessThan(0);
      }

      if (expectedYSign === 0) {
        expect(physResult.vy).toBeCloseTo(0, 5);
        expect(fVec.y).toBeCloseTo(0, 5);
      } else if (expectedYSign > 0) {
        expect(physResult.vy).toBeGreaterThan(0);
        expect(fVec.y).toBeGreaterThan(0);
      } else {
        expect(physResult.vy).toBeLessThan(0);
        expect(fVec.y).toBeLessThan(0);
      }

      // 2. Check createBullet velocity direction for a stationary ship
      const bulletSpeed = 300;
      const bulletEntity = createBullet({
        world,
        x: 0,
        y: 0,
        rotation,
        speed: bulletSpeed
      });

      const bulletVel = world.getComponent(bulletEntity, "Velocity") as { vx: number; vy: number };
      expect(bulletVel).toBeDefined();

      if (expectedXSign === 0) {
        expect(bulletVel.vx).toBeCloseTo(0, 5);
      } else if (expectedXSign > 0) {
        expect(bulletVel.vx).toBeGreaterThan(0);
      } else {
        expect(bulletVel.vx).toBeLessThan(0);
      }

      if (expectedYSign === 0) {
        expect(bulletVel.vy).toBeCloseTo(0, 5);
      } else if (expectedYSign > 0) {
        expect(bulletVel.vy).toBeGreaterThan(0);
      } else {
        expect(bulletVel.vy).toBeLessThan(0);
      }

      // 3. Confirm directional signs of thrust and bullet velocity match each other exactly
      expect(Math.sign(Math.round(physResult.vx * 1000))).toBe(Math.sign(Math.round(bulletVel.vx * 1000)));
      expect(Math.sign(Math.round(physResult.vy * 1000))).toBe(Math.sign(Math.round(bulletVel.vy * 1000)));
    }
  );
});
