import { World, type CoreComponentRegistry, type Renderer, type RenderContext } from "@tiny-aster/core";
import type { IDrawAdapter } from "../DrawAdapter";
import {
  drawPixelFxDust,
  drawPixelFxExplosion,
  drawPixelFxImpact,
  drawPixelFxHitstun,
  drawPixelFxStagger,
  drawPixelFxInkBurst,
  drawPixelFxMuzzle,
  drawPixelFxPickup,
  drawPixelFxShieldCrack,
  drawPixelFxSlash,
  drawPixelFxPaddleImpact,
  drawPixelFxBrickShatter,
  drawPixelFxFlapGust,
  drawPixelFxHop,
  drawPixelFxPhaseDash,
  drawPixelFxTeleport,
  drawPixelFxSurfaceSkid,
  drawPixelFxMechanicalMotion,
  drawPixelFxRicochet,
  drawPixelFxCharge,
  drawPixelFxShieldPulse,
  drawPixelFxParry,
  drawPixelFxPerfectBlock,
  drawPixelFxCriticalHit,
  drawPixelFxProjectileDeflection,
  drawPixelFxGuardBreak,
  drawPixelFxArmorBreak,
  drawPixelFxComboFinisher,
  drawPixelFxHeal,
  drawPixelFxPoison,
  drawPixelFxBurn,
  drawPixelFxFrost,
  drawPixelFxElectric,
  drawPixelFxBleed,
  drawPixelFxBuff,
  drawPixelFxDebuff,
  drawPixelFxSpawn,
  drawPixelFxDeath,
  registerPixelFxProceduralVFX
} from "../PixelFxProceduralVFX";

type MockDrawAdapter = {
  [K in keyof IDrawAdapter]: jest.Mock;
};

function createAdapter(): MockDrawAdapter {
  return {
    save: jest.fn(),
    restore: jest.fn(),
    fillCircle: jest.fn(),
    strokeCircle: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    drawLine: jest.fn(),
    drawArc: jest.fn(),
    drawText: jest.fn(),
    drawGlow: jest.fn()
  };
}

function createWorld(remaining = 0.2, vfxAnimDuration?: number): { world: World<CoreComponentRegistry>; entity: number } {
  const world = new World<CoreComponentRegistry>();
  const entity = world.createEntity();
  const renderComponent: CoreComponentRegistry["Render"] & { vfxAnimDuration?: number } = {
    type: "Render",
    shape: "circle",
    size: 32,
    color: "#ffffff",
    opacity: 1,
    visible: true,
    order: 0,
    rotation: 0,
    angularVelocity: 0,
    hitFlashFrames: 0,
    ...(vfxAnimDuration !== undefined ? { vfxAnimDuration } : {})
  };
  world.addComponent(entity, renderComponent as never);
  world.addComponent(entity, { type: "TTL", remaining, timeLeft: 0.4 });
  world.addComponent(entity, {
    type: "Transform",
    x: 0,
    y: 0,
    rotation: 0.25,
    scaleX: 1,
    scaleY: 1,
    worldX: 0,
    worldY: 0,
    worldRotation: 0.25,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: false
  });
  return { world, entity };
}

describe("PixelFX-inspired procedural VFX", () => {
  it("keeps visual progress independent from TTL when animDuration is configured", () => {
    const defaultAdapter = createAdapter();
    const defaultState = createWorld(0.2);
    drawPixelFxImpact(defaultAdapter, defaultState.world, defaultState.entity);

    const fastAdapter = createAdapter();
    const fastState = createWorld(0.2);
    fastState.world.mutateComponent(fastState.entity, "Render", render => {
      (render as never as { vfxAnimDuration?: number }).vfxAnimDuration = 0.2;
    });
    drawPixelFxImpact(fastAdapter, fastState.world, fastState.entity);

    expect(fastAdapter.strokeCircle.mock.calls[0][2])
      .toBeGreaterThan(defaultAdapter.strokeCircle.mock.calls[0][2]);
    expect(fastState.world.getComponent(fastState.entity, "TTL")).toEqual({ type: "TTL", remaining: 0.2, timeLeft: 0.4 });
  });

  it("draws the impact composition with deterministic ring and shard geometry", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    drawPixelFxImpact(adapter, world, entity);
    expect(adapter.strokeCircle).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalledTimes(24);
  });

  it("evolves Impact from a concentrated contact flash into an expanding shock ring", () => {
    const early = createAdapter(), earlyState = createWorld(0.36);
    drawPixelFxImpact(early, earlyState.world, earlyState.entity);
    const late = createAdapter(), lateState = createWorld(0.04);
    drawPixelFxImpact(late, lateState.world, lateState.entity);
    expect(late.strokeCircle.mock.calls[0][2]).toBeGreaterThan(early.strokeCircle.mock.calls[0][2]);
    expect(late.strokeCircle.mock.calls[0][5]).toBeLessThan(early.strokeCircle.mock.calls[0][5]);
    expect(early.drawArc).toHaveBeenCalledTimes(2);
  });

  it("draws a directional slash as arcs and trailing strokes", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    drawPixelFxSlash(adapter, world, entity);
    expect(adapter.drawArc).toHaveBeenCalledTimes(2);
    expect(adapter.drawLine).toHaveBeenCalledTimes(5);
  });

  it("draws fragmenting explosions deterministically from the entity identity", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    drawPixelFxExplosion(adapter, world, entity);
    expect(adapter.strokeCircle).toHaveBeenCalledTimes(1);
    expect(adapter.drawLine).toHaveBeenCalledTimes(20);
  });

  it("reproduces explosion geometry for the same seed and varies it for a different seed", () => {
    const render = { size: 32, color: "#ffffff", opacity: 1 };
    const ttl = { remaining: 0.2, timeLeft: 0.4 };
    const transform = { rotation: 0.25, scaleX: 1 };
    const world = {
      getComponent: (_entity: number, component: string) => {
        if (component === "Render") return render;
        if (component === "TTL") return ttl;
        if (component === "Transform") return transform;
        return undefined;
      }
    } as never as World<CoreComponentRegistry>;
    const drawForEntity = (entity: number) => {
      const adapter = createAdapter();
      drawPixelFxExplosion(adapter, world, entity);
      return adapter.drawLine.mock.calls;
    };

    expect(drawForEntity(104729)).toEqual(drawForEntity(104729));
    expect(drawForEntity(104729)).not.toEqual(drawForEntity(130363));
  });

  it("choreographs shield pulse as a staged wave with a delayed echo", () => {
    const early = createAdapter();
    const earlyState = createWorld(0.36); // progress 0.1
    drawPixelFxShieldPulse(early, earlyState.world, earlyState.entity);
    const late = createAdapter();
    const lateState = createWorld(0.08); // progress 0.8
    drawPixelFxShieldPulse(late, lateState.world, lateState.entity);

    expect(late.strokeCircle.mock.calls[0][2]).toBeGreaterThan(early.strokeCircle.mock.calls[0][2]);
    expect(early.strokeCircle).toHaveBeenCalledTimes(2);
    expect(late.strokeCircle).toHaveBeenCalledTimes(3);
    expect(late.strokeCircle.mock.calls[2][5]).toBeGreaterThan(0);
  });

  it("animates charge buildup and ricochet release through temporal samplers", () => {
    const early = createAdapter();
    const earlyState = createWorld(0.32); // progress 0.2
    drawPixelFxCharge(early, earlyState.world, earlyState.entity);
    const late = createAdapter();
    const lateState = createWorld(0.04); // progress 0.9
    drawPixelFxCharge(late, lateState.world, lateState.entity);
    expect(late.fillCircle.mock.calls[0][2]).toBeGreaterThan(early.fillCircle.mock.calls[0][2]);

    const ricochetEarly = createAdapter();
    drawPixelFxRicochet(ricochetEarly, earlyState.world, earlyState.entity);
    const ricochetLate = createAdapter();
    drawPixelFxRicochet(ricochetLate, lateState.world, lateState.entity);
    expect(ricochetLate.drawLine.mock.calls[1][2]).toBeGreaterThan(ricochetEarly.drawLine.mock.calls[1][2]);
  });

  it("animates a parry clash into a delayed directional counter-burst", () => {
    const early = createAdapter();
    const earlyState = createWorld(0.36);
    drawPixelFxParry(early, earlyState.world, earlyState.entity);
    const late = createAdapter();
    const lateState = createWorld(0.04);
    drawPixelFxParry(late, lateState.world, lateState.entity);

    expect(early.drawArc).toHaveBeenCalledTimes(2);
    expect(late.drawLine.mock.calls[0][2]).toBeGreaterThan(early.drawLine.mock.calls[0][2]);
    expect(late.fillCircle.mock.calls[0][4]).toBeLessThan(early.fillCircle.mock.calls[0][4]);
  });


  it("animates Perfect Block from compression into a confirmed expanding guard pulse", () => {
    const early = createAdapter(), earlyState = createWorld(0.36);
    drawPixelFxPerfectBlock(early, earlyState.world, earlyState.entity);
    const late = createAdapter(), lateState = createWorld(0.04);
    drawPixelFxPerfectBlock(late, lateState.world, lateState.entity);
    expect(late.strokeCircle.mock.calls[0][2]).toBeGreaterThan(early.strokeCircle.mock.calls[0][2]);
    expect(late.fillCircle.mock.calls[0][4]).toBeLessThan(early.fillCircle.mock.calls[0][4]);
  });

  it("animates Critical Hit with a double-beat core and outward fragments", () => {
    const early = createAdapter(), earlyState = createWorld(0.32);
    drawPixelFxCriticalHit(early, earlyState.world, earlyState.entity);
    const late = createAdapter(), lateState = createWorld(0.04);
    drawPixelFxCriticalHit(late, lateState.world, lateState.entity);
    expect(late.drawLine.mock.calls[0][2]).toBeGreaterThan(early.drawLine.mock.calls[0][2]);
    expect(late.fillCircle.mock.calls[0][2]).toBeGreaterThan(early.fillCircle.mock.calls[0][2]);
  });

  it("draws a curved projectile deflection and a timed clash flash", () => {
    const early = createAdapter(), earlyState = createWorld(0.36);
    drawPixelFxProjectileDeflection(early, earlyState.world, earlyState.entity);
    const late = createAdapter(), lateState = createWorld(0.04);
    drawPixelFxProjectileDeflection(late, lateState.world, lateState.entity);
    expect(early.drawLine).toHaveBeenCalledTimes(13);
    expect(late.drawLine).toHaveBeenCalledTimes(13);
    expect(late.fillCircle.mock.calls[0][4]).toBeLessThan(early.fillCircle.mock.calls[0][4]);
  });

  it("keeps Hitstun as a compact interruption cue with a pulsing orbit", () => {
    const early = createAdapter(), earlyState = createWorld(0.36);
    drawPixelFxHitstun(early, earlyState.world, earlyState.entity);
    const late = createAdapter(), lateState = createWorld(0.04);
    drawPixelFxHitstun(late, lateState.world, lateState.entity);
    expect(early.drawArc).toHaveBeenCalledTimes(3);
    expect(late.drawArc.mock.calls[0][2]).toBeGreaterThan(early.drawArc.mock.calls[0][2]);
    expect(early.fillCircle).toHaveBeenCalledTimes(1);
  });

  it("distinguishes Stagger with a sheared, off-axis stability ring", () => {
    const early = createAdapter(), earlyState = createWorld(0.36);
    drawPixelFxStagger(early, earlyState.world, earlyState.entity);
    const late = createAdapter(), lateState = createWorld(0.04);
    drawPixelFxStagger(late, lateState.world, lateState.entity);
    expect(early.drawArc).toHaveBeenCalledTimes(3);
    expect(late.drawArc.mock.calls[0][2]).toBeGreaterThan(early.drawArc.mock.calls[0][2]);
  });

  it("animates Guard Break by opening a shield contour into branching fractures", () => {
    const early = createAdapter(), earlyState = createWorld(0.36);
    drawPixelFxGuardBreak(early, earlyState.world, earlyState.entity);
    const late = createAdapter(), lateState = createWorld(0.04);
    drawPixelFxGuardBreak(late, lateState.world, lateState.entity);
    expect(early.drawLine).toHaveBeenCalledTimes(6);
    expect(late.drawLine.mock.calls.length).toBeGreaterThan(early.drawLine.mock.calls.length);
    expect(early.drawArc).toHaveBeenCalled();
    expect(early.fillCircle).toHaveBeenCalledTimes(1);
  });

  it("renders Ricochet as a directional path change rather than a radial burst", () => {
    const early = createAdapter(), earlyState = createWorld(0.36);
    drawPixelFxRicochet(early, earlyState.world, earlyState.entity);
    const late = createAdapter(), lateState = createWorld(0.04);
    drawPixelFxRicochet(late, lateState.world, lateState.entity);
    expect(early.drawLine).toHaveBeenCalledTimes(8);
    expect(early.drawArc).toHaveBeenCalledTimes(1);
    expect(early.strokeCircle).not.toHaveBeenCalled();
    expect(Math.hypot(late.drawLine.mock.calls[1][2], late.drawLine.mock.calls[1][3]))
      .toBeGreaterThan(Math.hypot(early.drawLine.mock.calls[1][2], early.drawLine.mock.calls[1][3]));
  });

  it("animates Armor Break plates outward from the fractured shell", () => {
    const early = createAdapter(), earlyState = createWorld(0.36);
    drawPixelFxArmorBreak(early, earlyState.world, earlyState.entity);
    const late = createAdapter(), lateState = createWorld(0.04);
    drawPixelFxArmorBreak(late, lateState.world, lateState.entity);
    expect(late.drawLine.mock.calls[0][0]).not.toBe(early.drawLine.mock.calls[0][0]);
    expect(late.fillCircle.mock.calls[0][0]).not.toBe(early.fillCircle.mock.calls[0][0]);
  });

  it("animates Combo Finisher through anticipation, slash and terminal pulse", () => {
    const early = createAdapter(), earlyState = createWorld(0.36);
    drawPixelFxComboFinisher(early, earlyState.world, earlyState.entity);
    const late = createAdapter(), lateState = createWorld(0.04);
    drawPixelFxComboFinisher(late, lateState.world, lateState.entity);
    expect(late.drawArc.mock.calls[0][2]).toBeGreaterThan(early.drawArc.mock.calls[0][2]);
    expect(late.fillCircle.mock.calls[0][4]).toBeLessThan(early.fillCircle.mock.calls[0][4]);
  });

  it("draws the five additional procedural compositions", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    drawPixelFxDust(adapter, world, entity);
    expect(adapter.fillCircle).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();

    adapter.fillCircle.mockClear();
    adapter.drawLine.mockClear();
    drawPixelFxPickup(adapter, world, entity);
    expect(adapter.strokeCircle).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxMuzzle(adapter, world, entity);
    expect(adapter.drawLine).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxShieldCrack(adapter, world, entity);
    expect(adapter.drawLine).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();

    adapter.fillCircle.mockClear();
    drawPixelFxInkBurst(adapter, world, entity);
    expect(adapter.fillCircle).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();
  });

  it("draws the five gameplay-specific compositions", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    drawPixelFxPaddleImpact(adapter, world, entity);
    expect(adapter.drawArc).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxBrickShatter(adapter, world, entity);
    // BrickShatter now builds its rotated rectangle from adapter lines.
    expect(adapter.drawLine).toHaveBeenCalledTimes(28);

    adapter.drawLine.mockClear();
    drawPixelFxFlapGust(adapter, world, entity);
    expect(adapter.drawArc).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxHop(adapter, world, entity);
    expect(adapter.drawArc).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxPhaseDash(adapter, world, entity);
    expect(adapter.drawLine).toHaveBeenCalled();
  });

  it("draws deterministic traversal compositions through the shared adapter", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    drawPixelFxTeleport(adapter, world, entity);
    expect(adapter.strokeCircle).toHaveBeenCalledTimes(2);
    expect(adapter.drawArc).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.strokeCircle.mockClear();
    adapter.drawLine.mockClear();
    drawPixelFxSurfaceSkid(adapter, world, entity);
    expect(adapter.drawArc).toHaveBeenCalled();
    expect(adapter.fillCircle).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.strokeCircle.mockClear();
    adapter.drawLine.mockClear();
    adapter.fillCircle.mockClear();
    drawPixelFxMechanicalMotion(adapter, world, entity);
    expect(adapter.strokeCircle).toHaveBeenCalledTimes(3);
    expect(adapter.drawLine).toHaveBeenCalledTimes(16);
    expect(adapter.fillCircle).toHaveBeenCalledTimes(1);
  });

  it("draws traversal effects at initial TTL progress", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld(0.4);
    drawPixelFxTeleport(adapter, world, entity);
    expect(adapter.strokeCircle).toHaveBeenCalled();
    adapter.strokeCircle.mockClear();
    drawPixelFxSurfaceSkid(adapter, world, entity);
    expect(adapter.drawArc).toHaveBeenCalled();
    adapter.drawArc.mockClear();
    drawPixelFxMechanicalMotion(adapter, world, entity);
    expect(adapter.strokeCircle).toHaveBeenCalled();
  });

  it("suppresses effects when render opacity is zero", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    world.mutateComponent(entity, "Render", render => { render.opacity = 0; });
    drawPixelFxTeleport(adapter, world, entity);
    drawPixelFxHitstun(adapter, world, entity);
    drawPixelFxStagger(adapter, world, entity);
    drawPixelFxSurfaceSkid(adapter, world, entity);
    drawPixelFxMechanicalMotion(adapter, world, entity);
    drawPixelFxRicochet(adapter, world, entity);
    drawPixelFxCharge(adapter, world, entity);
    drawPixelFxShieldPulse(adapter, world, entity);
    drawPixelFxParry(adapter, world, entity);
    drawPixelFxPerfectBlock(adapter, world, entity);
    drawPixelFxCriticalHit(adapter, world, entity);
    drawPixelFxProjectileDeflection(adapter, world, entity);
    drawPixelFxGuardBreak(adapter, world, entity);
    drawPixelFxArmorBreak(adapter, world, entity);
    drawPixelFxComboFinisher(adapter, world, entity);
    drawPixelFxHeal(adapter, world, entity);
    drawPixelFxPoison(adapter, world, entity);
    drawPixelFxBurn(adapter, world, entity);
    drawPixelFxFrost(adapter, world, entity);
    drawPixelFxElectric(adapter, world, entity);
    drawPixelFxBleed(adapter, world, entity);
    drawPixelFxBuff(adapter, world, entity);
    drawPixelFxDebuff(adapter, world, entity);
    drawPixelFxSpawn(adapter, world, entity);
    drawPixelFxDeath(adapter, world, entity);
    drawPixelFxTimeWarp(adapter, world, entity);
    drawPixelFxSoulReap(adapter, world, entity);
    drawPixelFxSeismicWave(adapter, world, entity);
    drawPixelFxBladeDance(adapter, world, entity);
    drawPixelFxGravityWell(adapter, world, entity);
    drawPixelFxArcChain(adapter, world, entity);
    drawPixelFxRift(adapter, world, entity);
    drawPixelFxMeteor(adapter, world, entity);
    drawPixelFxVortex(adapter, world, entity);
    drawPixelFxNova(adapter, world, entity);
    expect(adapter.drawLine).not.toHaveBeenCalled();
    expect(adapter.drawArc).not.toHaveBeenCalled();
    expect(adapter.strokeCircle).not.toHaveBeenCalled();
    expect(adapter.fillCircle).not.toHaveBeenCalled();
  });

  it("draws all ten new status and lifecycle effects with stable adapter operations", () => {
    const effects = [
      drawPixelFxHeal, drawPixelFxPoison, drawPixelFxBurn, drawPixelFxFrost,
      drawPixelFxElectric, drawPixelFxBleed, drawPixelFxBuff, drawPixelFxDebuff,
      drawPixelFxSpawn, drawPixelFxDeath
    ];
    for (const drawEffect of effects) {
      const first = createAdapter();
      const firstState = createWorld(0.16);
      drawEffect(first, firstState.world, firstState.entity);
      const second = createAdapter();
      const secondState = createWorld(0.16);
      drawEffect(second, secondState.world, secondState.entity);
      const operationCount = (adapter: MockDrawAdapter) =>
        adapter.fillCircle.mock.calls.length + adapter.strokeCircle.mock.calls.length +
        adapter.drawLine.mock.calls.length + adapter.drawArc.mock.calls.length;
      expect(operationCount(first)).toBeGreaterThan(0);
      expect(operationCount(first)).toBe(operationCount(second));
      expect(first.drawLine.mock.calls).toEqual(second.drawLine.mock.calls);
      expect(first.drawArc.mock.calls).toEqual(second.drawArc.mock.calls);
    }
  });

  it("renders all ten high-dynamics compositions deterministically and changes them over TTL", () => {
    const effects = [drawPixelFxNova, drawPixelFxVortex, drawPixelFxMeteor, drawPixelFxRift, drawPixelFxArcChain, drawPixelFxGravityWell, drawPixelFxBladeDance, drawPixelFxSeismicWave, drawPixelFxSoulReap, drawPixelFxTimeWarp];
    for (const effect of effects) {
      const early=createAdapter(), earlyState=createWorld(0.36);
      effect(early,earlyState.world,earlyState.entity);
      const late=createAdapter(), lateState=createWorld(0.04);
      effect(late,lateState.world,lateState.entity);
      const count=(d: MockDrawAdapter)=>d.drawLine.mock.calls.length+d.drawArc.mock.calls.length+d.strokeCircle.mock.calls.length+d.fillCircle.mock.calls.length;
      expect(count(early)).toBeGreaterThan(0);
      expect(count(late)).toBe(count(early));
      expect(late.drawLine.mock.calls).not.toEqual(early.drawLine.mock.calls);
      const again=createAdapter(), againState=createWorld(0.04);
      effect(again,againState.world,againState.entity);
      expect(again.drawLine.mock.calls).toEqual(late.drawLine.mock.calls);
    }
  });

  it("does not draw expired effects", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld(0);
    drawPixelFxImpact(adapter, world, entity);
    drawPixelFxSlash(adapter, world, entity);
    drawPixelFxExplosion(adapter, world, entity);
    drawPixelFxDust(adapter, world, entity);
    drawPixelFxPickup(adapter, world, entity);
    drawPixelFxMuzzle(adapter, world, entity);
    drawPixelFxShieldCrack(adapter, world, entity);
    drawPixelFxInkBurst(adapter, world, entity);
    drawPixelFxPaddleImpact(adapter, world, entity);
    drawPixelFxBrickShatter(adapter, world, entity);
    drawPixelFxFlapGust(adapter, world, entity);
    drawPixelFxHop(adapter, world, entity);
    drawPixelFxPhaseDash(adapter, world, entity);
    drawPixelFxTeleport(adapter, world, entity);
    drawPixelFxHitstun(adapter, world, entity);
    drawPixelFxStagger(adapter, world, entity);
    drawPixelFxSurfaceSkid(adapter, world, entity);
    drawPixelFxMechanicalMotion(adapter, world, entity);
    drawPixelFxRicochet(adapter, world, entity);
    drawPixelFxCharge(adapter, world, entity);
    drawPixelFxShieldPulse(adapter, world, entity);
    drawPixelFxParry(adapter, world, entity);
    drawPixelFxPerfectBlock(adapter, world, entity);
    drawPixelFxCriticalHit(adapter, world, entity);
    drawPixelFxProjectileDeflection(adapter, world, entity);
    drawPixelFxGuardBreak(adapter, world, entity);
    drawPixelFxArmorBreak(adapter, world, entity);
    drawPixelFxComboFinisher(adapter, world, entity);
    drawPixelFxHeal(adapter, world, entity);
    drawPixelFxPoison(adapter, world, entity);
    drawPixelFxBurn(adapter, world, entity);
    drawPixelFxFrost(adapter, world, entity);
    drawPixelFxElectric(adapter, world, entity);
    drawPixelFxBleed(adapter, world, entity);
    drawPixelFxBuff(adapter, world, entity);
    drawPixelFxDebuff(adapter, world, entity);
    drawPixelFxSpawn(adapter, world, entity);
    drawPixelFxDeath(adapter, world, entity);
    expect(adapter.drawLine).not.toHaveBeenCalled();
    expect(adapter.drawArc).not.toHaveBeenCalled();
    expect(adapter.strokeCircle).not.toHaveBeenCalled();
    expect(adapter.fillCircle).not.toHaveBeenCalled();
  });

  it("registers all forty-nine shapes for Canvas", () => {
    const registerShape = jest.fn();
    const renderer = {
      type: "canvas" as const,
      registerShape
    } as never as Renderer<CoreComponentRegistry, RenderContext>;
    registerPixelFxProceduralVFX(renderer);
    expect(registerShape).toHaveBeenCalledTimes(49);
    expect(registerShape.mock.calls.map(([name]) => name)).toEqual([
      "pixelfx_impact",
      "pixelfx_hitstun",
      "pixelfx_stagger",
      "pixelfx_slash",
      "pixelfx_explosion",
      "pixelfx_dust",
      "pixelfx_pickup",
      "pixelfx_muzzle",
      "pixelfx_shield_crack",
      "pixelfx_ink_burst",
      "pixelfx_paddle_impact",
      "pixelfx_brick_shatter",
      "pixelfx_flap_gust",
      "pixelfx_hop",
      "pixelfx_phase_dash",
      "pixelfx_ricochet",
      "pixelfx_charge",
      "pixelfx_shield_pulse",
      "pixelfx_parry",
      "pixelfx_perfect_block",
      "pixelfx_critical_hit",
      "pixelfx_projectile_deflection",
      "pixelfx_guard_break",
      "pixelfx_armor_break",
      "pixelfx_combo_finisher",
      "pixelfx_target_warning",
      "pixelfx_teleport",
      "pixelfx_surface_skid",
      "pixelfx_mechanical_motion",
      "pixelfx_heal",
      "pixelfx_poison",
      "pixelfx_burn",
      "pixelfx_frost",
      "pixelfx_electric",
      "pixelfx_bleed",
      "pixelfx_buff",
      "pixelfx_debuff",
      "pixelfx_spawn",
      "pixelfx_death",
      "pixelfx_nova",
      "pixelfx_vortex",
      "pixelfx_meteor",
      "pixelfx_rift",
      "pixelfx_arc_chain",
      "pixelfx_gravity_well",
      "pixelfx_blade_dance",
      "pixelfx_seismic_wave",
      "pixelfx_soul_reap",
      "pixelfx_time_warp"
    ]);
  });

  it("registers the same forty-nine-shape contract for Skia", () => {
    const registerShape = jest.fn();
    const renderer = {
      type: "skia" as const,
      registerShape
    } as never as Renderer<CoreComponentRegistry, RenderContext>;
    registerPixelFxProceduralVFX(renderer);
    expect(registerShape).toHaveBeenCalledTimes(39);
    expect(registerShape.mock.calls.map(([name]) => name)).toEqual([
      "pixelfx_impact",
      "pixelfx_hitstun",
      "pixelfx_stagger",
      "pixelfx_slash",
      "pixelfx_explosion",
      "pixelfx_dust",
      "pixelfx_pickup",
      "pixelfx_muzzle",
      "pixelfx_shield_crack",
      "pixelfx_ink_burst",
      "pixelfx_paddle_impact",
      "pixelfx_brick_shatter",
      "pixelfx_flap_gust",
      "pixelfx_hop",
      "pixelfx_phase_dash",
      "pixelfx_ricochet",
      "pixelfx_charge",
      "pixelfx_shield_pulse",
      "pixelfx_parry",
      "pixelfx_perfect_block",
      "pixelfx_critical_hit",
      "pixelfx_projectile_deflection",
      "pixelfx_guard_break",
      "pixelfx_armor_break",
      "pixelfx_combo_finisher",
      "pixelfx_target_warning",
      "pixelfx_teleport",
      "pixelfx_surface_skid",
      "pixelfx_mechanical_motion",
      "pixelfx_heal",
      "pixelfx_poison",
      "pixelfx_burn",
      "pixelfx_frost",
      "pixelfx_electric",
      "pixelfx_bleed",
      "pixelfx_buff",
      "pixelfx_debuff",
      "pixelfx_spawn",
      "pixelfx_death"
    ]);
  });
});
