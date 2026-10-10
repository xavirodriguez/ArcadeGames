import { System, World, Camera2DSystem } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";

export class HeadToHeadStateSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  public update(world: World<RacingComponentRegistry, RacingEventRegistry>, deltaTime: number): void {
    const h2hEntities = world.query("HeadToHeadState");
    if (h2hEntities.length === 0) return;
    const h2hEntity = h2hEntities[0]!;
    const rawH2H = world.getComponent(h2hEntity, "HeadToHeadState");
    if (!rawH2H) return;

    const h2h = {
      type: "HeadToHeadState" as const,
      leaderEntity: rawH2H.leaderEntity,
      scores: { ...rawH2H.scores },
      targetScore: rawH2H.targetScore,
      phase: rawH2H.phase,
      roundCountdown: rawH2H.roundCountdown,
      winner: rawH2H.winner
    };

    let modified = false;

    if (h2h.phase === "countdown") {
      h2h.roundCountdown = Math.max(0, h2h.roundCountdown - deltaTime);
      if (h2h.roundCountdown <= 0) {
        h2h.phase = "racing";
        const bus = world.getEventBus?.();
        if (bus) bus.emitDeferred("head_to_head:round_start", {});
      }
      world.commands.addComponent(h2hEntity, h2h);
      return;
    }

    if (h2h.phase === "round_end") {
      h2h.roundCountdown = Math.max(0, h2h.roundCountdown - deltaTime);
      if (h2h.roundCountdown <= 0) {
        this.respawnTrailingCars(world);
        h2h.phase = "countdown";
        h2h.roundCountdown = 2.0;
      }
      world.commands.addComponent(h2hEntity, h2h);
      return;
    }

    if (h2h.phase !== "racing") {
      return;
    }

    const cars = world.query("Car", "Transform");
    if (cars.length < 2) return;

    let leader = cars[0]!;
    let maxProgress = -Infinity;

    for (let i = 0; i < cars.length; i++) {
      const c = cars[i]!;
      const transform = world.getComponent(c, "Transform");
      const lap = world.getComponent(c, "Lap");
      if (!transform) continue;

      const progress = (lap ? lap.lastCheckpoint * 1000 : 0) + transform.x;
      if (progress > maxProgress) {
        maxProgress = progress;
        leader = c;
      }
    }

    h2h.leaderEntity = leader;
    modified = true;

    const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i]!;
      if (car === leader) continue;

      const transform = world.getComponent(car, "Transform");
      if (!transform) continue;

      let inDeadlyZone = false;
      if (trackSpec && trackSpec.zones) {
        for (let j = 0; j < trackSpec.zones.length; j++) {
          const zone = trackSpec.zones[j]!;
          if (zone.surface === "deadly_edge") {
                        // TODO(refactor): código duplicado detectado (bloque) con racing/systems/RacingSurfaceSystem.ts:25-32. Considerar extraer a función compartida. Ref: fee52f4e
const halfW = zone.width / 2;
            const halfH = zone.height / 2;
            if (
              transform.x >= zone.x - halfW &&
              transform.x <= zone.x + halfW &&
              transform.y >= zone.y - halfH &&
              transform.y <= zone.y + halfH
            ) {
              inDeadlyZone = true;
              break;
            }
          }
        }
      }

      const inViewport = Camera2DSystem.isEntityInViewport(world as never, car, -20);
      if (!inViewport || inDeadlyZone) {
        this.handleRoundLoss(world, h2h, leader, car);
        modified = true;
        break;
      }
    }

    if (modified) {
      world.commands.addComponent(h2hEntity, h2h);
    }
  }

  private handleRoundLoss(
    world: World<RacingComponentRegistry, RacingEventRegistry>,
    h2h: { phase: string; roundCountdown: number; scores: Record<string, number>; targetScore: number; winner: string | null },
    winnerCar: number,
    _loserCar: number
  ): void {
    h2h.phase = "round_end";
    h2h.roundCountdown = 1.5;

    const winnerId = world.hasComponent(winnerCar, "LocalPlayer") ? "player_1" : "player_2";
    const currentScore = (h2h.scores[winnerId] ?? 0) + 1;
    h2h.scores[winnerId] = currentScore;

    const bus = world.getEventBus?.();
    if (bus) {
      bus.emitDeferred("head_to_head:point", {
        winnerId,
        scores: { ...h2h.scores }
      });
    }

    if (currentScore >= h2h.targetScore) {
      h2h.phase = "finished";
      h2h.winner = winnerId;
      if (bus) {
        bus.emitDeferred("race:finished", { totalTime: 0, laps: 0 });
      }
    }
  }

  private respawnTrailingCars(world: World<RacingComponentRegistry, RacingEventRegistry>): void {
    const cars = world.query("Car", "Transform");
    if (cars.length < 2) return;

    const h2h = world.getSingleton("HeadToHeadState");
    const leader = h2h?.leaderEntity ?? cars[0]!;
    const leaderTransform = world.getComponent(leader, "Transform");
    if (!leaderTransform) return;

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i]!;
      if (car === leader) continue;

      const trans = world.getMutableComponent(car, "Transform");
      const vel = world.getMutableComponent(car, "Velocity");
      if (trans) {
        trans.x = leaderTransform.x - 60;
        trans.y = leaderTransform.y;
        trans.rotation = leaderTransform.rotation;
        trans.dirty = true;
      }
      if (vel) {
        vel.vx = 0;
        vel.vy = 0;
      }
    }
  }

  public onRegister(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}
  public dispose(): void {}
}
