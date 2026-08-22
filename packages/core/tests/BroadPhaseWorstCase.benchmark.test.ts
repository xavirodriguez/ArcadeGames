import { World } from "../src/ecs/World";
import { BroadPhase } from "../src/physics/collision/BroadPhase";
import { CircleShape, BoxShape, ShapeType } from "../src/physics/shapes/Shapes";
import { TransformComponent, ColliderComponent, CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { performance } from "perf_hooks";

describe("BroadPhase Worst-Case Benchmark (Phase 1 Gate)", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
  });

  function createEntityWithBox(x: number, y: number, w: number, h: number) {
    const entity = world.createEntity();
    const transform: TransformComponent = {
      type: "Transform",
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: x,
      worldY: y,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    };
    const collider: ColliderComponent = {
      type: "Collider",
      shape: { type: ShapeType.Box, width: w, height: h } as BoxShape,
      layer: 1,
      mask: 1,
      isTrigger: false,
      enabled: true,
    };
    world.addComponent(entity, transform);
    world.addComponent(entity, collider);
    return entity;
  }

  function createEntityWithCircle(x: number, y: number, radius: number) {
    const entity = world.createEntity();
    const transform: TransformComponent = {
      type: "Transform",
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: x,
      worldY: y,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    };
    const collider: ColliderComponent = {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius } as CircleShape,
      layer: 1,
      mask: 1,
      isTrigger: false,
      enabled: true,
    };
    world.addComponent(entity, transform);
    world.addComponent(entity, collider);
    return entity;
  }

  it("Escenario 1: Alineación degenerada en el eje X (falla early-break)", () => {
    // 300 entidades alineadas verticalmente en X = 100, extendiéndose horizontalmente [0, 200]
    // Esto obliga a sweepAndPrune a comparar casi todos los pares en X.
    const entities = [];
    for (let i = 0; i < 300; i++) {
      entities.push(createEntityWithBox(100, i * 2, 200, 10));
    }

    // Warmup
    BroadPhase.sweepAndPrune(entities, world);

    const start = performance.now();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      BroadPhase.sweepAndPrune(entities, world);
    }
    const totalMs = performance.now() - start;
    const avgMs = totalMs / iterations;

    console.log(`[Benchmark] Escenario 1 (Alineación X, 300 entidades): ${avgMs.toFixed(4)} ms / tick`);
    expect(avgMs).toBeLessThan(2.5);
  });

  it("Escenario 2: Clúster denso superpuesto (explosión combinatoria de pares)", () => {
    const entities = [];
    for (let i = 0; i < 200; i++) {
      entities.push(createEntityWithCircle(100 + (i % 5), 100 + (i % 5), 50));
    }

    // Warmup
    BroadPhase.sweepAndPrune(entities, world);

    const start = performance.now();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      BroadPhase.sweepAndPrune(entities, world);
    }
    const totalMs = performance.now() - start;
    const avgMs = totalMs / iterations;

    console.log(`[Benchmark] Escenario 2 (Clúster denso, 200 entidades): ${avgMs.toFixed(4)} ms / tick`);
    expect(avgMs).toBeLessThan(2.5);
  });

  it("Escenario 3: Inversión total de orden (peor caso para Shell Sort)", () => {
    const count = 300;
    const entities = [];
    for (let i = 0; i < count; i++) {
      entities.push(createEntityWithBox(i * 10, 100, 5, 5));
    }

    // Primer pase para ordenar
    BroadPhase.sweepAndPrune(entities, world);

    // Invertir las posiciones X de todas las entidades
    for (let i = 0; i < count; i++) {
      const e = entities[i];
      const transform = world.getMutableComponent(e, "Transform")!;
      transform.x = (count - i) * 10;
      transform.worldX = transform.x;
    }

    const start = performance.now();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      BroadPhase.sweepAndPrune(entities, world);
    }
    const totalMs = performance.now() - start;
    const avgMs = totalMs / iterations;

    console.log(`[Benchmark] Escenario 3 (Inversión total, 300 entidades): ${avgMs.toFixed(4)} ms / tick`);
    expect(avgMs).toBeLessThan(2.5);
  });

  it("Escenario 4: Simulación de alta densidad estilo Geometry Wars (500 entidades)", () => {
    const count = 500;
    const entities = [];
    for (let i = 0; i < count; i++) {
      entities.push(createEntityWithCircle((i * 17) % 800, (i * 23) % 600, 15));
    }

    // Warmup
    BroadPhase.sweepAndPrune(entities, world);

    const start = performance.now();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      BroadPhase.sweepAndPrune(entities, world);
    }
    const totalMs = performance.now() - start;
    const avgMs = totalMs / iterations;

    console.log(`[Benchmark] Escenario 4 (Geometry Wars density, 500 entidades): ${avgMs.toFixed(4)} ms / tick`);
    expect(avgMs).toBeLessThan(2.5);
  });
});
