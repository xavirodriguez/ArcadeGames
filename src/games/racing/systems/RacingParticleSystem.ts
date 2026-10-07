import { System, World } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import { computeSlip } from "../physics/CarSlipHelper";

export interface SkidSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  age: number;
  maxAge: number;
  width: number;
}

export interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  age: number;
  maxAge: number;
}

export class RacingParticlePool {
  public readonly skidMarks: SkidSegment[];
  public skidWriteIndex = 0;
  public skidCount = 0;

  public readonly smokeParticles: SmokeParticle[];
  public smokeWriteIndex = 0;
  public smokeCount = 0;

  constructor(skidCapacity: number = 256, smokeCapacity: number = 64) {
    this.skidMarks = new Array(skidCapacity);
    for (let i = 0; i < skidCapacity; i += 1) {
      this.skidMarks[i] = { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, age: 0, maxAge: 2.0, width: 3 };
    }

    this.smokeParticles = new Array(smokeCapacity);
    for (let i = 0; i < smokeCapacity; i += 1) {
      this.smokeParticles[i] = { x: 0, y: 0, vx: 0, vy: 0, radius: 4, alpha: 0, age: 0, maxAge: 0.8 };
    }
  }

  public addSkidSegment(x1: number, y1: number, x2: number, y2: number, width: number, maxAge: number = 2.0): void {
    const seg = this.skidMarks[this.skidWriteIndex]!;
    seg.x1 = x1;
    seg.y1 = y1;
    seg.x2 = x2;
    seg.y2 = y2;
    seg.alpha = 0.5;
    seg.age = 0;
    seg.maxAge = maxAge;
    seg.width = width;

    this.skidWriteIndex = (this.skidWriteIndex + 1) % this.skidMarks.length;
    if (this.skidCount < this.skidMarks.length) this.skidCount += 1;
  }

  public addSmokeParticle(x: number, y: number, vx: number, vy: number, radius: number = 5): void {
    const p = this.smokeParticles[this.smokeWriteIndex]!;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.radius = radius;
    p.alpha = 0.6;
    p.age = 0;
    p.maxAge = 0.7;

    this.smokeWriteIndex = (this.smokeWriteIndex + 1) % this.smokeParticles.length;
    if (this.smokeCount < this.smokeParticles.length) this.smokeCount += 1;
  }

  public update(dt: number): void {
    // Update skid marks decay
    for (let i = 0; i < this.skidMarks.length; i += 1) {
      const seg = this.skidMarks[i]!;
      if (seg.alpha > 0) {
        seg.age += dt;
        if (seg.age >= seg.maxAge) {
          seg.alpha = 0;
        } else {
          seg.alpha = 0.5 * (1 - seg.age / seg.maxAge);
        }
      }
    }

    // Update smoke particles motion & decay
    for (let i = 0; i < this.smokeParticles.length; i += 1) {
      const p = this.smokeParticles[i]!;
      if (p.alpha > 0) {
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.radius += dt * 8; // expand slightly
        if (p.age >= p.maxAge) {
          p.alpha = 0;
        } else {
          p.alpha = 0.6 * (1 - p.age / p.maxAge);
        }
      }
    }
  }
}

export class RacingParticleSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  private lastCarPos: Map<number, { leftX: number; leftY: number; rightX: number; rightY: number }> = new Map();

  public update(world: World<RacingComponentRegistry, RacingEventRegistry>, dt: number): void {
    // Monotonic time clock resource
    let time = world.getResource<number>("RacingTime") ?? 0;
    time += dt;
    world.setResource("RacingTime", time);

    let pool = world.getResource<RacingParticlePool>("RacingParticles");
    if (!pool) {
      pool = new RacingParticlePool();
      world.setResource("RacingParticles", pool);
    }

    pool.update(dt);

    const cars = world.query("Car", "Transform", "Velocity");
    for (let i = 0; i < cars.length; i += 1) {
      const carEntity = cars[i]!;
      const transform = world.getComponent(carEntity, "Transform");
      const velocity = world.getComponent(carEntity, "Velocity");
      const render = world.getComponent(carEntity, "Render");
      if (!transform || !velocity) continue;

      const rot = transform.rotation;
      const size = render?.size ?? 16;

      const slip = computeSlip(velocity, rot);

      // Wheel positions relative to car center
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);

      // Rear wheels offset
      const rearX = transform.x - cosR * size * 0.7;
      const rearY = transform.y - sinR * size * 0.7;

      const leftX = rearX - sinR * size * 0.45;
      const leftY = rearY + cosR * size * 0.45;

      const rightX = rearX + sinR * size * 0.45;
      const rightY = rearY - cosR * size * 0.45;

      const last = this.lastCarPos.get(carEntity);

      if (slip.slipLevel >= 1 && last) {
        const segWidth = slip.slipLevel === 2 ? 4 : 2.5;
        pool.addSkidSegment(last.leftX, last.leftY, leftX, leftY, segWidth);
        pool.addSkidSegment(last.rightX, last.rightY, rightX, rightY, segWidth);
      }

      if (slip.slipLevel === 2) {
        const rand = world.renderRandom;
        // Add smoke particle at rear
        pool.addSmokeParticle(
          rearX + (rand.next() - 0.5) * 6,
          rearY + (rand.next() - 0.5) * 6,
          -velocity.vx * 0.2 + (rand.next() - 0.5) * 10,
          -velocity.vy * 0.2 + (rand.next() - 0.5) * 10,
          4
        );
      }

      this.lastCarPos.set(carEntity, { leftX, leftY, rightX, rightY });
    }
  }
}
