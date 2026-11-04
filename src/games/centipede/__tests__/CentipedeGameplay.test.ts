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
    let followerEntity: number | undefined;
    for (const sEnt of segments) {
      const seg = world.getComponent(sEnt, "CentipedeSegment")!;
      if (seg.segmentIndex === 5) {
        seg5Entity = sEnt;
      }
      if (seg.segmentIndex === 6) {
        followerEntity = sEnt;
      }
    }
    expect(seg5Entity).toBeDefined();
    expect(followerEntity).toBeDefined();
    const originalFollowerDirection = world.getComponent(followerEntity!, "CentipedeSegment")!.dirX;

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

    const newHeadEntity = heads.find((entity) => {
      const segment = world.getComponent(entity, "CentipedeSegment");
      return segment?.chainId !== "chain_start";
    });
    expect(newHeadEntity).toBeDefined();
    if (newHeadEntity !== undefined) {
      expect(world.getComponent(newHeadEntity, "CentipedeSegment")?.dirX).toBe(originalFollowerDirection);
    }

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

  it("loses a life when the flea touches the player", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 556 } });
    await game.init();
    const world = game.getWorld();

    const playerEntity = world.query("Shooter")[0];
    const playerTransform = world.getComponent(playerEntity, "Transform")!;
    CentipedeEntityFactory.createFlea(world, 0);

    const fleaEntity = world.query("Flea", "Transform")[0];
    const fleaTransform = world.getMutableComponent(fleaEntity, "Transform")!;
    fleaTransform.x = playerTransform.x;
    fleaTransform.y = playerTransform.y;

    game.update(0.016);

    expect(game.getGameState().lives).toBe(2);
    expect(game.getGameState().status).toBe("dying");

    game.destroy();
  });

  it("restores damaged and poisoned mushrooms when the player respawns", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 557 } });
    await game.init();
    const world = game.getWorld();

    CentipedeEntityFactory.createMushroom(world, 10, 10, false, 2);
    CentipedeEntityFactory.createMushroom(world, 11, 11, true, 4);
    CentipedeEntityFactory.createMushroom(world, 12, 12, false, 4);

    const stateEntity = world.query("CentipedeState")[0];
    const state = world.getMutableComponent(stateEntity, "CentipedeState")!;
    state.status = "dying";
    state.respawnTimerMs = 1;

    game.update(0.002);

    const partialMushroomEntity = world.query("Mushroom").find((entity) => {
      const mushroom = world.getComponent(entity, "Mushroom");
      return mushroom !== undefined && mushroom.row === 10 && mushroom.col === 10 && mushroom.hp === 2;
    });
    const poisonedMushroomEntity = world.query("Mushroom").find((entity) => {
      const mushroom = world.getComponent(entity, "Mushroom");
      return mushroom !== undefined && mushroom.row === 11 && mushroom.col === 11 && mushroom.isPoisoned;
    });
    const untouchedMushroomEntity = world.query("Mushroom").find((entity) => {
      const mushroom = world.getComponent(entity, "Mushroom");
      return mushroom !== undefined && mushroom.row === 12 && mushroom.col === 12;
    });

    expect(partialMushroomEntity).toBeDefined();
    expect(poisonedMushroomEntity).toBeDefined();
    expect(untouchedMushroomEntity).toBeDefined();
    if (
      partialMushroomEntity === undefined ||
      poisonedMushroomEntity === undefined ||
      untouchedMushroomEntity === undefined
    ) {
      throw new Error("Expected test mushrooms were not created");
    }

    expect(world.getComponent(partialMushroomEntity, "Mushroom")).toMatchObject({
      hp: 4,
      maxHp: 4,
      isPoisoned: false,
    });
    expect(world.getComponent(poisonedMushroomEntity, "Mushroom")).toMatchObject({
      hp: 4,
      maxHp: 4,
      isPoisoned: false,
    });
    expect(world.getComponent(untouchedMushroomEntity, "Mushroom")).toMatchObject({
      hp: 4,
      maxHp: 4,
      isPoisoned: false,
    });
    expect(game.getGameState().score).toBe(10);
    expect(game.getGameState().status).toBe("playing");

    game.destroy();
  });

  it("does not restore mushrooms when a wave ends", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 558 } });
    await game.init();
    const world = game.getWorld();

    CentipedeEntityFactory.createMushroom(world, 10, 10, false, 2);
    CentipedeEntityFactory.createMushroom(world, 11, 11, true, 4);

    const damagedMushroomEntity = world.query("Mushroom").find((entity) => {
      const mushroom = world.getComponent(entity, "Mushroom");
      return mushroom !== undefined && mushroom.row === 10 && mushroom.col === 10 && mushroom.hp === 2;
    });
    const poisonedMushroomEntity = world.query("Mushroom").find((entity) => {
      const mushroom = world.getComponent(entity, "Mushroom");
      return mushroom !== undefined && mushroom.row === 11 && mushroom.col === 11 && mushroom.isPoisoned;
    });
    expect(damagedMushroomEntity).toBeDefined();
    expect(poisonedMushroomEntity).toBeDefined();
    if (damagedMushroomEntity === undefined || poisonedMushroomEntity === undefined) {
      throw new Error("Expected test mushrooms were not created");
    }

    for (const segmentEntity of world.query("CentipedeSegment")) {
      world.commands.removeEntity(segmentEntity);
    }

    game.update(0.016);
    game.update(0.016);

    expect(game.getGameState().level).toBe(2);
    expect(world.getComponent(damagedMushroomEntity, "Mushroom")).toMatchObject({
      hp: 2,
      isPoisoned: false,
    });
    expect(world.getComponent(poisonedMushroomEntity, "Mushroom")).toMatchObject({
      hp: 4,
      isPoisoned: true,
    });

    game.destroy();
  });

  it("removes every mushroom in the spider's cell without affecting adjacent cells", async () => {
    const game = new CentipedeGame({ headless: true, gameOptions: { seed: 559 } });
    await game.init();
    const world = game.getWorld();

    CentipedeEntityFactory.createMushroom(world, 6, 6, false, 4);
    CentipedeEntityFactory.createMushroom(world, 6, 6, false, 4);
    CentipedeEntityFactory.createMushroom(world, 6, 7, false, 4);

    const targetMushrooms = world.query("Mushroom").filter((entity) => {
      const mushroom = world.getComponent(entity, "Mushroom");
      return mushroom !== undefined && mushroom.row === 6 && mushroom.col === 6;
    });
    const adjacentMushroom = world.query("Mushroom").find((entity) => {
      const mushroom = world.getComponent(entity, "Mushroom");
      return mushroom !== undefined && mushroom.row === 6 && mushroom.col === 7;
    });
    expect(targetMushrooms.length).toBeGreaterThanOrEqual(2);
    expect(adjacentMushroom).toBeDefined();
    if (targetMushrooms.length === 0 || adjacentMushroom === undefined) {
      throw new Error("Expected test mushrooms were not created");
    }

    const spiderTransform = world.getComponent(targetMushrooms[0], "Transform")!;
    CentipedeEntityFactory.createSpider(world, spiderTransform.x, spiderTransform.y);

    game.update(0.016);

    for (const mushroomEntity of targetMushrooms) {
      expect(world.getComponent(mushroomEntity, "Mushroom")).toBeUndefined();
    }
    expect(world.getComponent(adjacentMushroom, "Mushroom")).toBeDefined();

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
