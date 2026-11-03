import { World } from "@tiny-aster/core";
import {
  SpriteRegistry,
  createSpriteAnimator,
} from "../index";
import {
  drawLanceroSpriteCanvas,
  drawSkiaLanceroSprite,
  LANCERO_SPRITE_ID
} from "../LanceroSpriteVisuals";
import {
  drawSeaDragonSpriteCanvas,
  drawSkiaSeaDragonSprite,
  SEA_DRAGON_SPRITE_ID
} from "../../../space-invaders/rendering/SeaDragonVisuals";
import {
  drawGhostGalleonSpriteCanvas,
  drawSkiaGhostGalleonSprite,
  GHOST_GALLEON_SPRITE_ID
} from "../../../space-invaders/rendering/GhostGalleonVisuals";
import {
  drawTowerBasic,
  drawTowerSniper
} from "../../../tower-defense/rendering/TowerDefenseCanvasVisuals";
import {
  drawSkiaTowerBasic,
  drawSkiaTowerSniper
} from "../../../tower-defense/rendering/TowerDefenseSkiaVisuals";

describe("Sprite drawers pure presentation (no in-draw animation mutation)", () => {
  beforeAll(() => {
    SpriteRegistry.init();
  });

  it("produces identical animator state across consecutive draw calls without world.update", () => {
    const world = new World();
    const entity = world.createEntity();

    const animator = createSpriteAnimator(LANCERO_SPRITE_ID, "idle");
    world.addComponent(entity, animator);
    world.addComponent(entity, {
      type: "Render",
      shape: "lancero",
      visible: true,
      size: 32,
      opacity: 1,
      order: 0,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    });

    const ctx = {
      save: jest.fn(),
      restore: jest.fn(),
      globalAlpha: 1,
      beginPath: jest.fn(),
      ellipse: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      drawImage: jest.fn(),
    } as never;

    drawLanceroSpriteCanvas.draw(ctx, world as never, entity);
    const frameIndexAfterFirstDraw = animator.frameIndex;
    const timerAfterFirstDraw = animator.timer;

    drawLanceroSpriteCanvas.draw(ctx, world as never, entity);
    expect(animator.frameIndex).toBe(frameIndexAfterFirstDraw);
    expect(animator.timer).toBe(timerAfterFirstDraw);

    const canvas = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      drawImageRect: jest.fn(),
    };
    drawSkiaLanceroSprite.draw(canvas as never, world as never, entity);
    expect(animator.frameIndex).toBe(frameIndexAfterFirstDraw);
    expect(animator.timer).toBe(timerAfterFirstDraw);
  });

  it("SeaDragon and GhostGalleon drawers do not advance animation timers during draw", () => {
    const world = new World();
    const dragonEntity = world.createEntity();
    const dragonAnimator = createSpriteAnimator(SEA_DRAGON_SPRITE_ID, "fly");
    world.addComponent(dragonEntity, dragonAnimator);
    world.addComponent(dragonEntity, {
      type: "Render",
      shape: "sea_dragon",
      visible: true,
      size: 15,
      opacity: 1,
      order: 0,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    });

    const ctx = {
      save: jest.fn(),
      restore: jest.fn(),
      globalAlpha: 1,
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillRect: jest.fn(),
      translate: jest.fn(),
      drawImage: jest.fn(),
    } as never;

    drawSeaDragonSpriteCanvas.draw(ctx, world as never, dragonEntity);
    expect(dragonAnimator.timer).toBe(0);
    expect(dragonAnimator.frameIndex).toBe(0);

    drawSeaDragonSpriteCanvas.draw(ctx, world as never, dragonEntity);
    expect(dragonAnimator.timer).toBe(0);
    expect(dragonAnimator.frameIndex).toBe(0);

    const galleonEntity = world.createEntity();
    const galleonAnimator = createSpriteAnimator(GHOST_GALLEON_SPRITE_ID, "sail");
    world.addComponent(galleonEntity, galleonAnimator);
    world.addComponent(galleonEntity, {
      type: "Render",
      shape: "ghost_galleon",
      visible: true,
      size: 15,
      opacity: 1,
      order: 0,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    });

    drawGhostGalleonSpriteCanvas.draw(ctx, world as never, galleonEntity);
    expect(galleonAnimator.timer).toBe(0);
    expect(galleonAnimator.frameIndex).toBe(0);

    drawGhostGalleonSpriteCanvas.draw(ctx, world as never, galleonEntity);
    expect(galleonAnimator.timer).toBe(0);
    expect(galleonAnimator.frameIndex).toBe(0);
  });
});
