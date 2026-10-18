/**
 * Removes unhittable leftover enemies that keep the section gate locked.
 *
 * Cases:
 * - deferred spawn ghosts / missing collider / tiny render (white dots)
 * - enemies stuck on a depth lane the player never overlaps
 * - any Enemy still alive after the wave script has fully finished (+1.2s)
 */

import {
  System,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import {
  WAVE_DIRECTOR_RESOURCE,
  WAVE_SCRIPT_RESOURCE,
  type WaveDirectorState,
  type WaveScript
} from "../waves/HitRunWaveTypes";

function isPlayer(world: World<CoreComponentRegistry>, e: number): boolean {
  return (
    world.hasComponent(e, "BeltInput") || world.hasComponent(e, "PlatformerInput")
  );
}

function killEnemy(world: World<CoreComponentRegistry>, e: number): void {
  const mut = world.getMutableComponent(e, "Health") as
    | { current: number }
    | undefined;
  if (mut) mut.current = 0;
  if (!world.hasComponent(e, "Dead")) {
    world.getCommandBuffer().addComponent(e, { type: "Dead" });
  }
}

export class HitRunOrphanEnemyCleanupSystem extends System<CoreComponentRegistry> {
  private waveDoneTimer = 0;
  private lastScriptId = "";

  public update(world: World<CoreComponentRegistry>, dt: number): void {
    if (world.getResource("IsPaused") === true) return;

    const wave = world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
    const script = world.getResource<WaveScript>(WAVE_SCRIPT_RESOURCE);

    if (wave?.scriptId !== this.lastScriptId) {
      this.lastScriptId = wave?.scriptId ?? "";
      this.waveDoneTimer = 0;
    }

    const eventsLen = script?.events?.length ?? 0;
    const waveFullyDone =
      !!wave &&
      eventsLen > 0 &&
      wave.nextEventIndex >= eventsLen &&
      (wave.pendingStaggers?.length ?? 0) === 0;

    if (waveFullyDone) {
      this.waveDoneTimer += dt;
    } else {
      this.waveDoneTimer = 0;
    }

    // After wave script is exhausted, wipe leftovers so the gate can open.
    const forceWipe = waveFullyDone && this.waveDoneTimer >= 1.2;

    const withHealth = world.query("Health");
    for (let i = 0; i < withHealth.length; i++) {
      const e = withHealth[i];
      if (isPlayer(world, e)) continue;
      if (world.hasComponent(e, "Dead")) continue;

      const hasEnemy =
        world.hasComponent(e, "Enemy") ||
        ((world.getComponent(e, "Tag") as { tags?: string[] } | undefined)?.tags?.includes(
          "Enemy"
        ) ??
          false);

      const faction = world.getComponent(e, "Faction") as
        | { value?: string; faction?: string }
        | undefined;
      const isEnemyFaction =
        (faction?.value ?? faction?.faction) === "enemy";

      if (!hasEnemy && !isEnemyFaction) continue;

      const health = world.getComponent(e, "Health") as
        | { current?: number }
        | undefined;
      if (!health || (health.current ?? 0) <= 0) continue;

      if (forceWipe) {
        killEnemy(world, e);
        continue;
      }

      const render = world.getComponent(e, "Render") as
        | { size?: number; visible?: boolean }
        | undefined;
      const size = render?.size ?? 0;
      const hasCollider = world.hasComponent(e, "Collider2D");
      const hasHurtbox = world.hasComponent(e, "Hurtbox");

      const isOrphan =
        !hasCollider ||
        (size > 0 && size < 5) ||
        (hasEnemy && !hasHurtbox && size < 8);

      if (isOrphan) {
        killEnemy(world, e);
      }
    }
  }
}
