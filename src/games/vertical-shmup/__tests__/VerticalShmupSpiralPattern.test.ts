import { World } from "@tiny-aster/core";
import { VerticalShmupGame } from "../VerticalShmupGame";
import { createEnemy } from "../EntityFactory";
import { ShmupBulletPatternSystem } from "../systems/BulletPatternSystem";
import { ShmupComponentRegistry } from "../types/ShmupTypes";
import {
  advanceBulletPatternPhase,
  computeBulletPatternAngles,
  resolveSpinPerShot,
  tickBulletPattern,
  type BulletPatternConfig
} from "../../shared/BulletPatternSystem";

const SPIRAL: BulletPatternConfig = {
  kind: "spiral",
  bulletCount: 8,
  speed: 200,
  ratePerSec: 0.5,
  spinPerShot: Math.PI / 8
};

const TWO_PI = Math.PI * 2;

function normalizeAngle(angle: number): number {
  const wrapped = angle % TWO_PI;
  return wrapped < 0 ? wrapped + TWO_PI : wrapped;
}

function angleOfBullet(world: World<ShmupComponentRegistry>, entity: number): number {
  const velocity = world.getComponent(entity, "Velocity");
  if (!velocity) throw new Error("Expected projectile velocity");
  return normalizeAngle(Math.atan2(velocity.vy, velocity.vx));
}

/**
 * Runs the real ShmupBulletPatternSystem and returns the first-bullet angle of
 * every emitted volley. Bullets are identified by render shape, so the test is
 * independent from the projectile pool's tag name.
 */
function runVolleys(world: World<ShmupComponentRegistry>, volleys: number, deltaTime: number): number[][] {
  const system = new ShmupBulletPatternSystem();
  const seen = new Set<number>();
  const result: number[][] = [];
  const maxIterations = Math.ceil((volleys * (1 / SPIRAL.ratePerSec)) / deltaTime) + 16;

  for (let iteration = 0; iteration < maxIterations && result.length < volleys; iteration += 1) {
    system.update(world, deltaTime);
    const created: number[] = [];
    for (const bullet of world.query("Render", "Velocity")) {
      if (seen.has(bullet)) continue;
      if (world.getComponent(bullet, "Render")?.shape !== "shmup_enemy_bullet") continue;
      seen.add(bullet);
      created.push(bullet);
    }
    if (created.length > 0) {
      result.push(created.map((bullet) => angleOfBullet(world, bullet)));
    }
  }

  if (result.length !== volleys) {
    throw new Error(`Expected ${volleys} volleys, observed ${result.length}`);
  }
  return result;
}

function configureSpiral(world: World<ShmupComponentRegistry>, entity: number, config: BulletPatternConfig = SPIRAL): void {
  world.mutateComponent(entity, "BulletPattern", (pattern) => {
    pattern.config = { ...config };
    pattern.cooldownRemaining = 0;
    pattern.phase = 0;
  });
}

function createGame(): VerticalShmupGame {
  return new VerticalShmupGame({ headless: true, manualLoop: true });
}

describe("Spiral pattern phase (T1)", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) game.destroy();
  });

  async function createWorld(): Promise<{ world: World<ShmupComponentRegistry>; enemy: number }> {
    const game = createGame();
    games.push(game);
    await game.init();
    game.update(0);
    // Isolate pattern firing from the initial squad.
    for (const enemy of game.world.query("ShmupEnemy", "BulletPattern")) {
      game.world.mutateComponent(enemy, "BulletPattern", (pattern) => {
        pattern.config = { ...pattern.config, ratePerSec: 0 };
        pattern.cooldownRemaining = 1e9;
      });
    }
    const enemy = createEnemy(game.world, 120, 200, "straight", 1);
    configureSpiral(game.world, enemy);
    return { world: game.world, enemy };
  }

  it("advances exactly spinPerShot between two consecutive shots", async () => {
    const { world } = await createWorld();
    const volleys = runVolleys(world, 2, 1 / 60);
    const firstAngle = volleys[0][0];
    const secondAngle = volleys[1][0];

    expect(normalizeAngle(secondAngle - firstAngle)).toBeCloseTo(SPIRAL.spinPerShot ?? 0, 6);
  });

  it("accumulates spinPerShot per shot", async () => {
    const { world } = await createWorld();
    const volleys = runVolleys(world, 5, 1 / 60);
    const spin = SPIRAL.spinPerShot ?? 0;

    for (let index = 1; index < volleys.length; index += 1) {
      const expected = normalizeAngle(volleys[0][0] + index * spin);
      expect(normalizeAngle(volleys[index][0])).toBeCloseTo(expected, 6);
    }
  });

  it("keeps the same angular sequence for different deltaTime values", async () => {
    const runs: number[][][] = [];
    for (const deltaTime of [1 / 60, 1 / 30, 0.021]) {
      const { world } = await createWorld();
      runs.push(runVolleys(world, 4, deltaTime));
    }

    const [reference, second, third] = runs;
    for (const candidate of [second, third]) {
      for (let volley = 0; volley < reference.length; volley += 1) {
        expect(candidate[volley][0]).toBeCloseTo(reference[volley][0], 6);
      }
    }
  });

  it("replays the same sequence when the pattern is recreated", async () => {
    const first = await createWorld();
    const firstSequence = runVolleys(first.world, 4, 1 / 60);

    const second = await createWorld();
    const secondSequence = runVolleys(second.world, 4, 1 / 60);

    expect(secondSequence).toEqual(firstSequence);
  });

  it("does not depend on entity update order", async () => {
    const collectPerEnemy = async (createFarFirst: boolean): Promise<{ near: number[]; far: number[] }> => {
      const game = createGame();
      games.push(game);
      await game.init();
      game.update(0);
      for (const enemy of game.world.query("ShmupEnemy", "BulletPattern")) {
        game.world.mutateComponent(enemy, "BulletPattern", (pattern) => {
          pattern.config = { ...pattern.config, ratePerSec: 0 };
          pattern.cooldownRemaining = 1e9;
        });
      }

      let near = 0;
      let far = 0;
      if (createFarFirst) {
        far = createEnemy(game.world, 400, 200, "straight", 1);
        near = createEnemy(game.world, 100, 200, "straight", 1);
      } else {
        near = createEnemy(game.world, 100, 200, "straight", 1);
        far = createEnemy(game.world, 400, 200, "straight", 1);
      }
      configureSpiral(game.world, near);
      configureSpiral(game.world, far, { ...SPIRAL, spinPerShot: Math.PI / 3 });

      const system = new ShmupBulletPatternSystem();
      const nearAngles: number[] = [];
      const farAngles: number[] = [];
      const seen = new Set<number>();
      for (let step = 0; step < 900; step += 1) {
        system.update(game.world, 1 / 60);
        for (const bullet of game.world.query("Transform", "Render", "Velocity")) {
          if (seen.has(bullet)) continue;
          if (game.world.getComponent(bullet, "Render")?.shape !== "shmup_enemy_bullet") continue;
          seen.add(bullet);
          const bulletX = game.world.getComponent(bullet, "Transform")?.x ?? 0;
          const angle = angleOfBullet(game.world, bullet);
          if (Math.abs(bulletX - 100) < 1) nearAngles.push(angle);
          else if (Math.abs(bulletX - 400) < 1) farAngles.push(angle);
        }
        if (nearAngles.length >= 4 * SPIRAL.bulletCount && farAngles.length >= 4 * SPIRAL.bulletCount) break;
      }

      const firstOfEachVolley = (angles: number[]): number[] =>
        angles.filter((_angle, index) => index % SPIRAL.bulletCount === 0).slice(0, 4);

      return { near: firstOfEachVolley(nearAngles), far: firstOfEachVolley(farAngles) };
    };

    const normal = await collectPerEnemy(false);
    const reversed = await collectPerEnemy(true);

    expect(reversed.near).toEqual(normal.near);
    expect(reversed.far).toEqual(normal.far);
  });
});

describe("Bullet pattern pure helpers (T1)", () => {
  it("uses one bullet slot as the default spiral spin", () => {
    const config: BulletPatternConfig = { kind: "spiral", bulletCount: 8, speed: 100, ratePerSec: 1 };
    expect(resolveSpinPerShot(config)).toBeCloseTo(Math.PI / 4, 12);

    const explicit: BulletPatternConfig = { ...config, spinPerShot: 0.3 };
    expect(resolveSpinPerShot(explicit)).toBeCloseTo(0.3, 12);
  });

  it("does not advance phase from elapsed time", () => {
    const state = { cooldownRemaining: 0.5, phase: 1.25 };
    const afterLongFrame = tickBulletPattern(state, 10, SPIRAL);
    const afterShortFrame = tickBulletPattern(state, 1 / 240, SPIRAL);

    expect(afterLongFrame.phase).toBe(1.25);
    expect(afterShortFrame.phase).toBe(1.25);
    expect(afterLongFrame.cooldownRemaining).toBe(0);
  });

  it("advances phase only for spiral patterns", () => {
    expect(advanceBulletPatternPhase(0, SPIRAL)).toBeCloseTo(Math.PI / 8, 12);
    const ring: BulletPatternConfig = { kind: "ring", bulletCount: 8, speed: 100, ratePerSec: 1 };
    expect(advanceBulletPatternPhase(0, ring)).toBe(0);
  });

  it("applies the phase to every spiral bullet", () => {
    const angles = computeBulletPatternAngles(SPIRAL, 0, Math.PI / 8);
    expect(angles).toHaveLength(8);
    for (let index = 0; index < angles.length; index += 1) {
      expect(angles[index]).toBeCloseTo((Math.PI * 2 * index) / 8 + Math.PI / 8, 12);
    }
  });
});
