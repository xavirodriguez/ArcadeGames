import {
  DEFAULT_GRAZE_MARGIN,
  DEFAULT_GRAZE_SCORE,
  evaluateGraze,
  grazeOuterRadius,
  isGrazeDistance
} from "../graze/grazeMath";
import { VerticalShmupGame } from "../VerticalShmupGame";
import { ShmupGrazeSystem } from "../systems/ShmupGrazeSystem";
import { SystemPhase } from "@tiny-aster/core";

describe("Vertical Shmup graze contract (AUD-P2-01)", () => {
  const hitRadius = 10;

  it("defines annulus outside hit radius and within margin", () => {
    expect(grazeOuterRadius(hitRadius)).toBe(hitRadius + DEFAULT_GRAZE_MARGIN);
    expect(isGrazeDistance(hitRadius, hitRadius)).toBe(false);
    expect(isGrazeDistance(hitRadius + 1, hitRadius)).toBe(true);
    expect(isGrazeDistance(hitRadius + DEFAULT_GRAZE_MARGIN, hitRadius)).toBe(true);
    expect(isGrazeDistance(hitRadius + DEFAULT_GRAZE_MARGIN + 0.01, hitRadius)).toBe(false);
  });

  it("positive: near-miss grants graze without treating as hit", () => {
    const { graze, distance } = evaluateGraze({
      playerX: 0,
      playerY: 0,
      bulletX: hitRadius + 1,
      bulletY: 0,
      hitRadius
    });
    expect(distance).toBeGreaterThan(hitRadius);
    expect(graze).toBe(true);
    expect(DEFAULT_GRAZE_SCORE).toBe(10);
  });

  it("negative: overlap is hit territory, not graze", () => {
    const { graze } = evaluateGraze({
      playerX: 0,
      playerY: 0,
      bulletX: hitRadius * 0.5,
      bulletY: 0,
      hitRadius
    });
    expect(graze).toBe(false);
  });

  it("negative: far bullet is outside graze", () => {
    const { graze } = evaluateGraze({
      playerX: 0,
      playerY: 0,
      bulletX: hitRadius + DEFAULT_GRAZE_MARGIN + 5,
      bulletY: 0,
      hitRadius
    });
    expect(graze).toBe(false);
  });

  it("per-bullet-once: alreadyGrazed blocks a second credit", () => {
    const first = evaluateGraze({
      playerX: 0,
      playerY: 0,
      bulletX: hitRadius + 2,
      bulletY: 0,
      hitRadius,
      alreadyGrazed: false
    });
    const second = evaluateGraze({
      playerX: 0,
      playerY: 0,
      bulletX: hitRadius + 2,
      bulletY: 0,
      hitRadius,
      alreadyGrazed: true
    });
    expect(first.graze).toBe(true);
    expect(second.graze).toBe(false);
  });
});

describe("ShmupGrazeSystem integration", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) {
      game.destroy();
    }
  });

  it("awards score and grazeCount once when enemy bullet is in the annulus", async () => {
    const game = new VerticalShmupGame({ headless: true, manualLoop: true });
    games.push(game);
    await game.init();
    game.update(0);

    const world = game.world;
    const player = world.query("ShmupPlayer", "Transform")[0];
    expect(player).toBeDefined();
    const pt = world.getComponent(player, "Transform")!;
    const config = world.getResource<{ PLAYER_COLLIDER_RADIUS: number; GRAZE_MARGIN: number; GRAZE_SCORE: number }>("GameConfig")!;
    const r = config.PLAYER_COLLIDER_RADIUS;
    const margin = config.GRAZE_MARGIN ?? DEFAULT_GRAZE_MARGIN;

    const bullet = world.createEntity();
    world.addComponent(bullet, {
      type: "Transform",
      x: pt.x + r + margin * 0.5,
      y: pt.y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: pt.x + r + margin * 0.5,
      worldY: pt.y,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });
    world.addComponent(bullet, { type: "ShmupEnemyBullet" });

    const scoreBefore = world.getSingleton("ShmupGameState")!.score;
    const graze = new ShmupGrazeSystem();
    graze.update(world, 1 / 60);
    graze.update(world, 1 / 60);

    const state = world.getSingleton("ShmupGameState")!;
    expect(state.score).toBe(scoreBefore + (config.GRAZE_SCORE ?? DEFAULT_GRAZE_SCORE));
    expect(state.grazeCount).toBe(1);
  });
});
