import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { registerHitRunStateMachines } from "./hitRunStateMachines";
import { HitRunMeleeSystem } from "../melee/HitRunMeleeSystem";
import { HitRunHurtSystem } from "../hurt/HitRunHurtSystem";

export function createTestWorld(): {
  world: World<CoreComponentRegistry>;
  meleeSystem: HitRunMeleeSystem;
  hurtSystem: HitRunHurtSystem;
} {
  const world = new World<CoreComponentRegistry>();
  world.setResource("IsPaused", false);
  world.setResource("HitStopRemaining", 0);

  registerHitRunStateMachines(world);
  const meleeSystem = new HitRunMeleeSystem();
  const hurtSystem = new HitRunHurtSystem();

  const bus = world.getEventBus();
  if (bus) {
    hurtSystem.subscribe(bus);
  }

  return { world, meleeSystem, hurtSystem };
}

export function spawnTestPlayer(world: World<CoreComponentRegistry>, x: number, y = 100): number {
  const p = world.createEntity();
  world.addComponent(p, {
    type: "Transform",
    x,
    y,
    worldX: x,
    worldY: y,
    rotation: 0,
    worldRotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: true
  });
  world.addComponent(p, {
    type: "Velocity",
    vx: 0,
    vy: 0,
    angularVelocity: 0
  });
  world.addComponent(p, {
    type: "Health",
    current: 5,
    max: 5,
    invulnerableRemaining: 0
  });
  world.addComponent(p, {
    type: "PlatformerInput",
    moveDir: 0,
    jumpPressed: false,
    jumpHeld: false,
    jumpReleased: false
  });
  world.addComponent(p, {
    type: "Faction",
    value: "player"
  });
  world.addComponent(p, {
    type: "Render",
    shape: "player",
    size: 16,
    color: "#ffffff",
    visible: true,
    opacity: 1,
    order: 1,
    rotation: 0,
    angularVelocity: 0,
    hitFlashFrames: 0
  });
  return p;
}

export function updateStateMachineHelper(world: World<CoreComponentRegistry>, entity: number, dt: number): void {
  const fsm = world.getMutableComponent(entity, "StateMachine");
  if (!fsm) return;

  const registry = world.getResource<Record<string, { states: Record<string, { onEnter?: (w: World<CoreComponentRegistry>, e: number, d: Record<string, unknown>) => void; onUpdate?: (w: World<CoreComponentRegistry>, e: number, d: Record<string, unknown>, elapsed: number) => string | void }> }>>("StateMachineRegistry");
  if (!registry) return;

  const machine = registry[fsm.machineId];
  if (!machine) return;

  const stateDef = machine.states[fsm.currentState];
  if (!stateDef) return;

  fsm.elapsedInState += dt;
  if (stateDef.onUpdate) {
    const nextState = stateDef.onUpdate(world, entity, fsm.data, fsm.elapsedInState);
    if (nextState && nextState !== fsm.currentState) {
      fsm.previousState = fsm.currentState;
      fsm.currentState = nextState;
      fsm.elapsedInState = 0;
      const nextDef = machine.states[nextState];
      if (nextDef?.onEnter) {
        nextDef.onEnter(world, entity, fsm.data);
      }
    }
  }
}
