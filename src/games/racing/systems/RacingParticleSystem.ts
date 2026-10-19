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

export interface CollisionSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
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

  public readonly sparks: CollisionSpark[];
  public sparkWriteIndex = 0;
  public sparkCount = 0;
  public activeSparkCount = 0;

  constructor(
    skidCapacity: number = 256,
    smokeCapacity: number = 64,
    sparkCapacity: number = 48
  ) {
    this.skidMarks = new Array(skidCapacity);
    for (let i = 0; i < skidCapacity; i += 1) {
      this.skidMarks[i] = { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, age: 0, maxAge: 2.0, width: 3 };
    }

    this.smokeParticles = new Array(smokeCapacity);
    for (let i = 0; i < smokeCapacity; i += 1) {
      this.smokeParticles[i] = { x: 0, y: 0, vx: 0, vy: 0, radius: 4, alpha: 0, age: 0, maxAge: 0.8 };
    }

    this.sparks = new Array(sparkCapacity);
    for (let i = 0; i < sparkCapacity; i += 1) {
      this.sparks[i] = { x: 0, y: 0, vx: 0, vy: 0, length: 4, alpha: 0, age: 0, maxAge: 0.18 };
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

  public addSpark(
    x: number,
    y: number,
    vx: number,
    vy: number,
    length: number = 4,
    maxAge: number = 0.18
  ): void {
    const spark = this.sparks[this.sparkWriteIndex]!;
    if (spark.alpha <= 0) this.activeSparkCount += 1;
    spark.x = x;
    spark.y = y;
    spark.vx = vx;
    spark.vy = vy;
    spark.length = length;
    spark.alpha = 1;
    spark.age = 0;
    spark.maxAge = maxAge;

    this.sparkWriteIndex = (this.sparkWriteIndex + 1) % this.sparks.length;
    if (this.sparkCount < this.sparks.length) this.sparkCount += 1;
  }

  public update(dt: number): void {
    for (let i = 0; i < this.skidMarks.length; i += 1) {
      const seg = this.skidMarks[i]!;
      if (seg.alpha <= 0) continue;
      seg.age += dt;
      seg.alpha = seg.age >= seg.maxAge ? 0 : 0.5 * (1 - seg.age / seg.maxAge);
    }

    for (let i = 0; i < this.smokeParticles.length; i += 1) {
      const p = this.smokeParticles[i]!;
      if (p.alpha <= 0) continue;
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.radius += dt * 8;
      p.alpha = p.age >= p.maxAge ? 0 : 0.6 * (1 - p.age / p.maxAge);
    }

    // Small, bounded spark pool: brief lifetime keeps collisions punchy, not noisy.
    for (let i = 0; i < this.sparks.length; i += 1) {
      const spark = this.sparks[i]!;
      if (spark.alpha <= 0) continue;
      spark.age += dt;
      if (spark.age >= spark.maxAge) {
        spark.alpha = 0;
        this.activeSparkCount = Math.max(0, this.activeSparkCount - 1);
        continue;
      }
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= Math.max(0, 1 - dt * 4.5);
      spark.vy = spark.vy * Math.max(0, 1 - dt * 4.5) + 90 * dt;
      spark.alpha = 1 - spark.age / spark.maxAge;
    }
  }
}

interface CarVelocitySample {
  vx: number;
  vy: number;
}

export class RacingParticleSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  private lastCarPos: Map<number, { leftX: number; leftY: number; rightX: number; rightY: number }> = new Map();
  private lastCarVelocity: Map<number, CarVelocitySample> = new Map();
  private lastCollisionSparkTime: Map<number, number> = new Map();

  public update(world: World<RacingComponentRegistry, RacingEventRegistry>, dt: number): void {
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
    const visualRandom = world.renderRandom;

    for (let i = 0; i < cars.length; i += 1) {
      const carEntity = cars[i]!;
      const transform = world.getComponent(carEntity, "Transform");
      const velocity = world.getComponent(carEntity, "Velocity");
      const render = world.getComponent(carEntity, "Render");
      if (!transform || !velocity) continue;

      const rot = transform.rotation;
      const size = render?.size ?? 16;
      const slip = computeSlip(velocity, rot);

      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
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
        // Drift smoke is presentation-only and must not consume gameplay RNG.
        pool.addSmokeParticle(
          rearX + (visualRandom.next() - 0.5) * 6,
          rearY + (visualRandom.next() - 0.5) * 6,
          -velocity.vx * 0.2 + (visualRandom.next() - 0.5) * 10,
          -velocity.vy * 0.2 + (visualRandom.next() - 0.5) * 10,
          4
        );
      }

      // Infer a sharp collision impulse from the discontinuity in car velocity.
      // This keeps sparks visual-only and avoids coupling VFX into collision rules.
      const previousVelocity = this.lastCarVelocity.get(carEntity);
      if (previousVelocity) {
        const deltaVx = velocity.vx - previousVelocity.vx;
        const deltaVy = velocity.vy - previousVelocity.vy;
        const impulse = Math.hypot(deltaVx, deltaVy);
        const speedBefore = Math.hypot(previousVelocity.vx, previousVelocity.vy);
        const lastSparkTime = this.lastCollisionSparkTime.get(carEntity) ?? Number.NEGATIVE_INFINITY;

        if (speedBefore > 55 && impulse > 145 && time - lastSparkTime >= 0.12) {
          const impactAngle = Math.atan2(-deltaVy, -deltaVx);
          const impactX = transform.x + Math.cos(impactAngle) * size * 0.72;
          const impactY = transform.y + Math.sin(impactAngle) * size * 0.72;

          for (let sparkIndex = 0; sparkIndex < 9; sparkIndex += 1) {
            const angle = impactAngle + (visualRandom.next() - 0.5) * 2.4;
            const speed = 55 + visualRandom.next() * 175;
            pool.addSpark(
              impactX,
              impactY,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              2 + visualRandom.next() * 5,
              0.12 + visualRandom.next() * 0.16
            );
          }
          this.lastCollisionSparkTime.set(carEntity, time);
        }
      }

      this.lastCarPos.set(carEntity, { leftX, leftY, rightX, rightY });
      this.lastCarVelocity.set(carEntity, { vx: velocity.vx, vy: velocity.vy });
    }
  }
}
