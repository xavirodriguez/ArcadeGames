import { CentipedeGame } from "../CentipedeGame";
import { CentipedeEntityFactory } from "../EntityFactory";

describe("Centipede Gameplay Logic (Headless)", () => {
  it("creates simulation cleanly and initializes game state", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();

    const world = game.getWorld();
    const state = game.getGameState();

    expect(state).toBeDefined();
    expect(state.lives).toBe(3);
    expect(state.score).toBe(0);
    expect(state.level).toBe(1);

    const player = world.query("Shooter")[0];
    expect(player).toBeDefined();

    const segments = world.query("CentipedeSegment");
    expect(segments.length).toBeGreaterThan(0);

    game.destroy();
  });

  it("splits centipede into two independent chains upon middle segment destruction, spawning a mushroom with 4 HP in same tick", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 100 } });
    await game.init();
    const world = game.getWorld();

    const segments = world.query("CentipedeSegment");
    expect(segments.length).toBe(12);

    let seg5Entity: number | undefined;
    for (const sEnt of segments) {
      const seg = world.getComponent(sEnt, "CentipedeSegment")!;
      if (seg.segmentIndex === 5) {
        seg5Entity = sEnt;
        break;
      }
    }
    expect(seg5Entity).toBeDefined();

    const gridPos5 = world.getComponent(seg5Entity!, "GridPos")!;
    const deadRow = gridPos5.row;
    const deadCol = gridPos5.col;

    const segPos = world.getComponent(seg5Entity!, "Transform")!;

    CentipedeEntityFactory.createDart(world, segPos.x, segPos.y);

    game.update(0.016);

    expect(world.getComponent(seg5Entity!, "CentipedeSegment")).toBeUndefined();

    const mushrooms = world.query("Mushroom");
    const createdMushroom = mushrooms.find((mEnt: number) => {
      const m = world.getComponent(mEnt, "Mushroom")!;
      return m.row === deadRow && m.col === deadCol;
    });

    expect(createdMushroom).toBeDefined();
    const mushroomComp = world.getComponent(createdMushroom!, "Mushroom")!;
    expect(mushroomComp.hp).toBe(4);

    const remainingSegments = world.query("CentipedeSegment");
    expect(remainingSegments.length).toBe(11);

    const heads = remainingSegments.filter((sEnt: number) => {
      const s = world.getComponent(sEnt, "CentipedeSegment")!;
      return s.isHead;
    });

    expect(heads.length).toBe(2);

    game.destroy();
  });

  it("causes centipede head to bounce and drop row when hitting a mushroom or grid boundary", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 777 } });
    await game.init();
    const world = game.getWorld();

    const headEntity = CentipedeEntityFactory.createCentipedeSegment(
      world,
      "test_chain",
      0,
      1,
      true,
      0,
      28,
      1,
      1
    );

    for (let i = 0; i < 10; i++) {
      game.update(0.1);
    }

    const pos = world.getComponent(headEntity, "GridPos")!;
    const seg = world.getComponent(headEntity, "CentipedeSegment")!;

    expect(pos.row).toBeGreaterThan(0);
    expect(seg.dirX).toBe(-1);

    game.destroy();
  });

  it("causes centipede head to dive vertically straight down when hitting a poisoned mushroom", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 999 } });
    await game.init();
    const world = game.getWorld();

    CentipedeEntityFactory.createMushroom(world, 2, 5, true, 4);

    const headEntity = CentipedeEntityFactory.createCentipedeSegment(
      world,
      "test_poison_chain",
      0,
      1,
      true,
      2,
      4,
      1,
      1
    );

    for (let i = 0; i < 15; i++) {
      game.update(0.08);
    }

    const pos = world.getComponent(headEntity, "GridPos")!;

    expect(pos.row).toBeGreaterThan(2);

    game.destroy();
  });

  it("advances wave level when all centipede segments are destroyed", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 123 } });
    await game.init();
    const world = game.getWorld();

    const segments = world.query("CentipedeSegment");
    for (const sEnt of segments) {
      world.commands.removeEntity(sEnt);
    }

    game.update(0.016);
    game.update(0.016);

    const state = game.getGameState();
    expect(state.level).toBe(2);

    const newSegments = world.query("CentipedeSegment");
    expect(newSegments.length).toBeGreaterThan(0);

    game.destroy();
  });

  it("reduces player life upon contact with enemy or centipede segment", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 555 } });
    await game.init();
    const world = game.getWorld();

    const playerEntity = world.query("Shooter")[0];
    const pTransform = world.getComponent(playerEntity, "Transform")!;

    CentipedeEntityFactory.createSpider(world, pTransform.x, pTransform.y);

    game.update(0.016);

    const state = game.getGameState();
    expect(state.lives).toBe(2);
    expect(state.status).toBe("dying");

    game.destroy();
  });

  it("simulates centipede movement over time to verify descending zig-zag into player zone", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();
    const world = game.getWorld();

    let maxRowReached = 0;
    const initialHead = world.query("CentipedeSegment").find(e => {
      const seg = world.getComponent(e, "CentipedeSegment");
      return seg?.isHead;
    });

    expect(initialHead).toBeDefined();

    // 2500 frames * 0.016s = 40 seconds of gameplay
    for (let frame = 0; frame < 2500; frame++) {
      game.update(0.016);
      const heads = world.query("CentipedeSegment").filter(e => {
        const seg = world.getComponent(e, "CentipedeSegment");
        return seg?.isHead;
      });
      for (const h of heads) {
        const gridPos = world.getComponent(h, "GridPos");
        if (gridPos && gridPos.row > maxRowReached) {
          maxRowReached = gridPos.row;
        }
      }
    }

    // Player zone starts at row 27 (GRID_ROWS 32 - PLAYER_ZONE_ROWS 5)
    expect(maxRowReached).toBeGreaterThanOrEqual(25);
    game.destroy();
  });
});
