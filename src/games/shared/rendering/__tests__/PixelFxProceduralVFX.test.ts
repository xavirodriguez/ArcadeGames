import { World, type CoreComponentRegistry, type Renderer, type RenderContext } from "@tiny-aster/core";
import { CanvasDrawAdapter, SkiaDrawAdapter, type IDrawAdapter } from "../DrawAdapter";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
  drawPixelFxNova,
  drawPixelFxVortex,
  drawPixelFxMeteor,
  drawPixelFxRift,
  drawPixelFxArcChain,
  drawPixelFxGravityWell,
  drawPixelFxBladeDance,
  drawPixelFxSeismicWave,
  drawPixelFxSoulReap,
  drawPixelFxTimeWarp,
  drawPixelFxPrismBurst,
  drawPixelFxSonicBoom,
  drawPixelFxMagneticSurge,
  drawPixelFxPlasmaOrbit,
  drawPixelFxSolarFlare,
  drawPixelFxCrystalBloom,
  drawPixelFxPulseLance,
  drawPixelFxEchoShatter,
  drawPixelFxTidalWave,
  drawPixelFxPhaseCollapse,
  drawPixelFxTargetWarning,
  registerPixelFxProceduralVFX,
  PIXEL_FX_RANDOM_STREAMS,
  rand,
  strokeW
} from "../PixelFxProceduralVFX";

type MockDrawAdapter = {
  [K in keyof IDrawAdapter]: jest.Mock;
};

function createAdapter(): MockDrawAdapter {
  return {
    save: jest.fn(),
    restore: jest.fn(),
    setBlendMode: jest.fn(),
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


const PIXEL_FX_DRAWERS: Readonly<Record<string, (draw: IDrawAdapter, world: World<CoreComponentRegistry>, entity: number) => void>> = {
  "pixelfx_impact": drawPixelFxImpact,
  "pixelfx_hitstun": drawPixelFxHitstun,
  "pixelfx_stagger": drawPixelFxStagger,
  "pixelfx_slash": drawPixelFxSlash,
  "pixelfx_explosion": drawPixelFxExplosion,
  "pixelfx_dust": drawPixelFxDust,
  "pixelfx_pickup": drawPixelFxPickup,
  "pixelfx_muzzle": drawPixelFxMuzzle,
  "pixelfx_shield_crack": drawPixelFxShieldCrack,
  "pixelfx_ink_burst": drawPixelFxInkBurst,
  "pixelfx_paddle_impact": drawPixelFxPaddleImpact,
  "pixelfx_brick_shatter": drawPixelFxBrickShatter,
  "pixelfx_flap_gust": drawPixelFxFlapGust,
  "pixelfx_hop": drawPixelFxHop,
  "pixelfx_phase_dash": drawPixelFxPhaseDash,
  "pixelfx_ricochet": drawPixelFxRicochet,
  "pixelfx_charge": drawPixelFxCharge,
  "pixelfx_shield_pulse": drawPixelFxShieldPulse,
  "pixelfx_parry": drawPixelFxParry,
  "pixelfx_perfect_block": drawPixelFxPerfectBlock,
  "pixelfx_critical_hit": drawPixelFxCriticalHit,
  "pixelfx_projectile_deflection": drawPixelFxProjectileDeflection,
  "pixelfx_guard_break": drawPixelFxGuardBreak,
  "pixelfx_armor_break": drawPixelFxArmorBreak,
  "pixelfx_combo_finisher": drawPixelFxComboFinisher,
  "pixelfx_target_warning": drawPixelFxTargetWarning,
  "pixelfx_teleport": drawPixelFxTeleport,
  "pixelfx_surface_skid": drawPixelFxSurfaceSkid,
  "pixelfx_mechanical_motion": drawPixelFxMechanicalMotion,
  "pixelfx_heal": drawPixelFxHeal,
  "pixelfx_poison": drawPixelFxPoison,
  "pixelfx_burn": drawPixelFxBurn,
  "pixelfx_frost": drawPixelFxFrost,
  "pixelfx_electric": drawPixelFxElectric,
  "pixelfx_bleed": drawPixelFxBleed,
  "pixelfx_buff": drawPixelFxBuff,
  "pixelfx_debuff": drawPixelFxDebuff,
  "pixelfx_spawn": drawPixelFxSpawn,
  "pixelfx_death": drawPixelFxDeath,
  "pixelfx_nova": drawPixelFxNova,
  "pixelfx_vortex": drawPixelFxVortex,
  "pixelfx_meteor": drawPixelFxMeteor,
  "pixelfx_rift": drawPixelFxRift,
  "pixelfx_arc_chain": drawPixelFxArcChain,
  "pixelfx_gravity_well": drawPixelFxGravityWell,
  "pixelfx_blade_dance": drawPixelFxBladeDance,
  "pixelfx_seismic_wave": drawPixelFxSeismicWave,
  "pixelfx_soul_reap": drawPixelFxSoulReap,
  "pixelfx_time_warp": drawPixelFxTimeWarp,
  "pixelfx_prism_burst": drawPixelFxPrismBurst,
  "pixelfx_sonic_boom": drawPixelFxSonicBoom,
  "pixelfx_magnetic_surge": drawPixelFxMagneticSurge,
  "pixelfx_plasma_orbit": drawPixelFxPlasmaOrbit,
  "pixelfx_solar_flare": drawPixelFxSolarFlare,
  "pixelfx_crystal_bloom": drawPixelFxCrystalBloom,
  "pixelfx_pulse_lance": drawPixelFxPulseLance,
  "pixelfx_echo_shatter": drawPixelFxEchoShatter,
  "pixelfx_tidal_wave": drawPixelFxTidalWave,
  "pixelfx_phase_collapse": drawPixelFxPhaseCollapse
};
const PIXEL_FX_EFFECT_NAMES = Object.keys(PIXEL_FX_DRAWERS);
const PIXEL_FX_PROGRESS = [0, 0.1, 0.25, 0.5, 0.75, 0.9] as const;

type PixelFxGoldenRow = {
  effect: string;
  entitySeeded: boolean;
  primitiveCalls: number[];
  sha256: string[];
};

function createGoldenWorld(progress: number): World<CoreComponentRegistry> {
  const render = { type: "Render", size: 32, color: "#FFFFFF", opacity: 1, vfxAnimDuration: 0.4 };
  const ttl = { type: "TTL", remaining: 0.4 * (1 - progress), timeLeft: 0.4 };
  const transform = { type: "Transform", rotation: 0.25, scaleX: 1 };
  return {
    getComponent: (_entity: number, component: string) => {
      if (component === "Render") return render;
      if (component === "TTL") return ttl;
      if (component === "Transform") return transform;
      return undefined;
    }
  } as never as World<CoreComponentRegistry>;
}

function createRecorderAdapter(): { adapter: IDrawAdapter; log: unknown[][] } {
  const log: unknown[][] = [];
  let adapter: IDrawAdapter;
  adapter = {
    save: () => { log.push(["save"]); },
    restore: () => { log.push(["restore"]); },
    setBlendMode: mode => { log.push(["setBlendMode", mode]); },
    fillCircle: (...args) => { log.push(["fillCircle", ...args]); },
    strokeCircle: (...args) => { log.push(["strokeCircle", ...args]); },
    fillRect: (...args) => { log.push(["fillRect", ...args]); },
    strokeRect: (...args) => { log.push(["strokeRect", ...args]); },
    drawLine: (...args) => { log.push(["drawLine", ...args]); },
    drawArc: (...args) => { log.push(["drawArc", ...args]); },
    drawText: (...args) => { log.push(["drawText", ...args]); },
    drawGlow: (color, drawFn) => {
      log.push(["drawGlow", color]);
      drawFn(adapter);
    }
  };
  return { adapter, log };
}


describe("PixelFX-inspired procedural VFX", () => {
  it("draws all ten additional high-dynamics effects with balanced adapter state", () => {
    const drawers = [drawPixelFxPrismBurst, drawPixelFxSonicBoom, drawPixelFxMagneticSurge, drawPixelFxPlasmaOrbit, drawPixelFxSolarFlare, drawPixelFxCrystalBloom, drawPixelFxPulseLance, drawPixelFxEchoShatter, drawPixelFxTidalWave, drawPixelFxPhaseCollapse];
    for (const drawer of drawers) {
      const adapter = createAdapter();
      const { world, entity } = createWorld();
      drawer(adapter, world, entity);
      expect(adapter.save).toHaveBeenCalledTimes(1);
      expect(adapter.restore).toHaveBeenCalledTimes(1);
      expect(adapter.drawLine.mock.calls.length + adapter.drawArc.mock.calls.length + adapter.strokeCircle.mock.calls.length + adapter.fillCircle.mock.calls.length).toBeGreaterThan(0);
    }
  });

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



  it("reuses Canvas and Skia adapters for each stable renderer context", () => {
    const canvasInstances: CanvasDrawAdapter[] = [];
    const skiaInstances: SkiaDrawAdapter[] = [];
    const canvasSave = jest.spyOn(CanvasDrawAdapter.prototype, "save").mockImplementation(function (this: CanvasDrawAdapter) {
      canvasInstances.push(this);
    });
    const skiaSave = jest.spyOn(SkiaDrawAdapter.prototype, "save").mockImplementation(function (this: SkiaDrawAdapter) {
      skiaInstances.push(this);
    });
    for (const method of ["restore", "fillCircle", "strokeCircle", "drawLine", "drawArc"] as const) {
      jest.spyOn(CanvasDrawAdapter.prototype, method).mockImplementation(() => {});
      jest.spyOn(SkiaDrawAdapter.prototype, method).mockImplementation(() => {});
    }

    try {
      const canvasShapes = new Map<string, { draw(ctx: CanvasRenderingContext2D, world: World<CoreComponentRegistry>, entity: number): void }>();
      registerPixelFxProceduralVFX({
        type: "canvas",
        registerShape: (name: string, drawer: unknown) => canvasShapes.set(name, drawer as never)
      } as never);
      const canvasDrawer = canvasShapes.get("pixelfx_impact");
      expect(canvasDrawer).toBeDefined();

      const skiaShapes = new Map<string, { draw(canvas: never, world: World<CoreComponentRegistry>, entity: number): void }>();
      registerPixelFxProceduralVFX({
        type: "skia",
        registerShape: (name: string, drawer: unknown) => skiaShapes.set(name, drawer as never)
      } as never);
      const skiaDrawer = skiaShapes.get("pixelfx_impact");
      expect(skiaDrawer).toBeDefined();

      const { world, entity } = createWorld();
      const ctx = {} as CanvasRenderingContext2D;
      const canvas = {} as never;
      canvasDrawer!.draw(ctx, world, entity);
      canvasDrawer!.draw(ctx, world, entity);
      skiaDrawer!.draw(canvas, world, entity);
      skiaDrawer!.draw(canvas, world, entity);

      expect(canvasInstances).toHaveLength(2);
      expect(canvasInstances[0]).toBe(canvasInstances[1]);
      expect(skiaInstances).toHaveLength(2);
      expect(skiaInstances[0]).toBe(skiaInstances[1]);
      expect(canvasSave).toHaveBeenCalledTimes(2);
      expect(skiaSave).toHaveBeenCalledTimes(2);
    } finally {
      jest.restoreAllMocks();
    }
  });

  it("matches the 59-effect adapter golden at six TTL progress samples", () => {
    const fixturePath = join(__dirname, "../../../../../docs/agents/fixtures/pixelfx-vfx-golden.jsonl");
    const rows = readFileSync(fixturePath, "utf8").trim().split(/\r?\n/).map(line => JSON.parse(line) as PixelFxGoldenRow);
    expect(rows).toHaveLength(59);
    expect(rows.map(row => row.effect)).toEqual(PIXEL_FX_EFFECT_NAMES);

    for (const row of rows) {
      const drawer = PIXEL_FX_DRAWERS[row.effect];
      expect(drawer).toBeDefined();
      PIXEL_FX_PROGRESS.forEach((progress, sampleIndex) => {
        const world = createGoldenWorld(progress);
        const first = createRecorderAdapter();
        drawer(first.adapter, world, 104729);
        const primitiveCount = first.log.filter(([method]) =>
          method !== "save" && method !== "restore" && method !== "setBlendMode"
        ).length;
        const digest = createHash("sha256").update(JSON.stringify(first.log)).digest("hex").slice(0, 16);

        expect(primitiveCount).toBe(row.primitiveCalls[sampleIndex]);
        expect(primitiveCount).toBeLessThanOrEqual(60);
        expect(digest).toBe(row.sha256[sampleIndex]);

        const repeated = createRecorderAdapter();
        drawer(repeated.adapter, world, 104729);
        expect(repeated.log).toEqual(first.log);

        const otherEntity = createRecorderAdapter();
        drawer(otherEntity.adapter, world, 130363);
        if (row.entitySeeded && progress === 0.5) {
          expect(otherEntity.log).not.toEqual(first.log);
        } else {
          expect(otherEntity.log).toEqual(first.log);
        }
      });
    }
  });

  it("keeps the shared stroke and random helpers deterministic and bounded", () => {
    expect(strokeW(32, 0.05, 1)).toBe(1.6);
    expect(strokeW(8, 0.05, 1)).toBe(1);
    const first = rand(104729, PIXEL_FX_RANDOM_STREAMS.explosion.angle);
    expect(first).toBe(rand(104729, PIXEL_FX_RANDOM_STREAMS.explosion.angle));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1);
    expect(rand(104729, PIXEL_FX_RANDOM_STREAMS.explosion.angle))
      .not.toBe(rand(104729, PIXEL_FX_RANDOM_STREAMS.explosion.speed));
  });

  it("registers all fifty-nine shapes for Canvas", () => {
    const registerShape = jest.fn();
    const renderer = {
      type: "canvas" as const,
      registerShape
    } as never as Renderer<CoreComponentRegistry, RenderContext>;
    registerPixelFxProceduralVFX(renderer);
    expect(registerShape).toHaveBeenCalledTimes(59);
    expect(registerShape.mock.calls.map(([name]) => name)).toEqual(PIXEL_FX_EFFECT_NAMES);
  });

  it("registers the same fifty-nine-shape contract for Skia", () => {
    const registerShape = jest.fn();
    const renderer = {
      type: "skia" as const,
      registerShape
    } as never as Renderer<CoreComponentRegistry, RenderContext>;
    registerPixelFxProceduralVFX(renderer);
    expect(registerShape).toHaveBeenCalledTimes(59);
    expect(registerShape.mock.calls.map(([name]) => name)).toEqual(PIXEL_FX_EFFECT_NAMES);
  });
});
