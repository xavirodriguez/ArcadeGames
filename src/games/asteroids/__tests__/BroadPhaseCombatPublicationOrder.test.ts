import {
  ColliderComponent,
  CollisionEventsComponent,
  CoreComponentRegistry,
  EventBus,
  HealthComponent,
  ShapeType,
  TransformComponent,
  World,
} from "@tiny-aster/core";
import { CombatSystem, DamageComponent } from "@tiny-aster/gameplay-kit";
import type { Entity } from "../../../../packages/core/src/ecs/Entity";
import { BroadPhase } from "../../../../packages/core/src/physics/collision/BroadPhase";
import { CollisionSystem2D } from "../../../../packages/core/src/physics/collision/CollisionSystems";
import {
  AsteroidsComponentRegistry,
  AsteroidsEventRegistry,
} from "../types/AsteroidRegistry";

type Fixture = {
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  eventBus: EventBus<AsteroidsEventRegistry>;
  entities: { a: Entity; b: Entity; c: Entity; d: Entity };
};

type PassResult = {
  pairs: Array<[Entity, Entity]>;
  publications: string[];
};

function createFixture(): Fixture {
  const world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
  const eventBus = new EventBus<AsteroidsEventRegistry>();
  world.setResource("EventBus", eventBus);

  const entities = {
    a: world.createEntity(),
    b: world.createEntity(),
    c: world.createEntity(),
    d: world.createEntity(),
  };

  // Circle radius is 10, so these centers produce minX [0, 1, 0, 0].
  // All four circles overlap on both axes, making the exact pair traversal observable.
  const xByEntity = new Map<Entity, number>([
    [entities.a, 10],
    [entities.b, 11],
    [entities.c, 10],
    [entities.d, 10],
  ]);

  for (const entity of Object.values(entities)) {
    const x = xByEntity.get(entity);
    if (x === undefined) {
      throw new Error(`Missing fixture coordinate for entity ${entity}`);
    }

    world.addComponent(entity, {
      type: "Transform",
      x,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: x,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    } satisfies TransformComponent);

    world.addComponent(entity, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 10 },
      layer: 1,
      mask: 1,
      enabled: true,
      isTrigger: false,
    } satisfies ColliderComponent);

    world.addComponent(entity, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: [],
    } satisfies CollisionEventsComponent);
  }

  // A is the only attacker. B/C/D each die from one hit, exposing publication order.
  world.addComponent(entities.a, {
    type: "Damage",
    amount: 1,
    category: "broadphase-order-regression",
    consumption: "none",
  } satisfies DamageComponent);

  for (const target of [entities.b, entities.c, entities.d]) {
    world.addComponent(target, {
      type: "Health",
      current: 1,
      max: 1,
    } satisfies HealthComponent);
  }

  return { world, eventBus, entities };
}

function getExpectedCanonicalPairs(entities: Fixture["entities"]): Array<[Entity, Entity]> {
  const { a, b, c, d } = entities;
  return [
    [a, c],
    [a, d],
    [a, b],
    [c, d],
    [c, b],
    [d, b],
  ];
}

function getExpectedCanonicalPublications(entities: Fixture["entities"]): string[] {
  const { b, c, d } = entities;
  return [
    `hit:${c}`,
    `death:${c}`,
    `hit:${d}`,
    `death:${d}`,
    `hit:${b}`,
    `death:${b}`,
  ];
}

function getMinX(
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
  entity: Entity
): number {
  const transform = world.getComponent(entity, "Transform");
  const collider = world.getComponent(entity, "Collider");
  if (!transform || !collider) {
    throw new Error(`Fixture entity ${entity} is missing Transform or Collider`);
  }
  return BroadPhase.getShapeBounds(transform, collider).minX;
}

/**
 * Test-side reference for the proposed production comparator:
 * (left.minX - right.minX) || (left.entity - right.entity).
 *
 * It deliberately sorts the candidate list before invoking the current broadphase.
 * This is a control experiment, not a production workaround.
 */
function applyProposedComparator(
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
  candidates: ReadonlyArray<Entity>
): Entity[] {
  return [...candidates].sort((left, right) => {
    const minXOrder = getMinX(world, left) - getMinX(world, right);
    return minXOrder !== 0 ? minXOrder : left - right;
  });
}

function executePass(
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
  eventBus: EventBus<AsteroidsEventRegistry>,
  candidates: Entity[]
): PassResult {
  const pairs = BroadPhase.sweepAndPrune(
    candidates,
    world as unknown as World<CoreComponentRegistry>,
    BroadPhase.createScratch()
  ).map(([a, b]) => [a, b] as [Entity, Entity]);

  const collisionSystem = new CollisionSystem2D<AsteroidsComponentRegistry>();
  collisionSystem.setCandidates([...candidates]);
  collisionSystem.update(world, 1 / 60);

  const publications: string[] = [];
  const unsubscribeHit = eventBus.on("combat:hit", (event) => {
    publications.push(`hit:${event.targetEntity}`);
  });
  const unsubscribeDeath = eventBus.on("combat:death", (event) => {
    publications.push(`death:${event.entity}`);
  });

  const combatSystem = new CombatSystem<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
  combatSystem.update(world, 1 / 60);
  eventBus.flushDeferred();

  unsubscribeHit();
  unsubscribeDeath();
  world.flush();

  return { pairs, publications };
}

function executeNormalAndReplay(
  fixture: Fixture,
  normalCandidates: Entity[],
  replayCandidates: Entity[]
): { normal: PassResult; replay: PassResult } {
  const { world, eventBus } = fixture;
  const snapshot = world.snapshot();

  const normal = executePass(world, eventBus, normalCandidates);

  // Restore the same logical world state, then resimulate with a different but equivalent
  // candidate enumeration. Candidate order is ephemeral; pair/publication order must not
  // be derived from that incidental order.
  world.restore(snapshot);
  world.setResource("EventBus", eventBus);
  world.isReSimulating = true;

  let replay: PassResult;
  try {
    replay = executePass(world, eventBus, replayCandidates);
  } finally {
    world.isReSimulating = false;
  }

  return { normal, replay };
}

describe("Asteroids broadphase combat publication ordering", () => {
  it("produces the exact canonical pair order for tied minX bounds in normal and replay", () => {
    const fixture = createFixture();
    const { a, b, c, d } = fixture.entities;
    const normalCandidates = [a, b, c, d];
    const replayCandidates = [a, c, d, b];

    expect(normalCandidates.map((entity) => getMinX(fixture.world, entity))).toEqual([0, 1, 0, 0]);

    const { normal, replay } = executeNormalAndReplay(
      fixture,
      normalCandidates,
      replayCandidates
    );
    const expectedPairs = getExpectedCanonicalPairs(fixture.entities);

    expect(normal.pairs).toEqual(expectedPairs);
    expect(replay.pairs).toEqual(expectedPairs);
  });

  it("publishes combat:hit and combat:death in the same order after restore/replay", () => {
    const fixture = createFixture();
    const { a, b, c, d } = fixture.entities;
    const { normal, replay } = executeNormalAndReplay(
      fixture,
      [a, b, c, d],
      [a, c, d, b]
    );
    const expectedPublications = getExpectedCanonicalPublications(fixture.entities);

    expect(normal.publications).toEqual(expectedPublications);
    expect(replay.publications).toEqual(expectedPublications);
    expect(replay.publications).toEqual(normal.publications);
  });

  it("confirms the proposed (minX, entityId) comparator makes both candidate permutations equivalent", () => {
    const fixture = createFixture();
    const { a, b, c, d } = fixture.entities;
    const normalOrder = applyProposedComparator(fixture.world, [a, b, c, d]);
    const replayOrder = applyProposedComparator(fixture.world, [a, c, d, b]);

    expect(normalOrder).toEqual([a, c, d, b]);
    expect(replayOrder).toEqual([a, c, d, b]);

    const { normal, replay } = executeNormalAndReplay(
      fixture,
      normalOrder,
      replayOrder
    );

    expect(normal.pairs).toEqual(getExpectedCanonicalPairs(fixture.entities));
    expect(replay.pairs).toEqual(getExpectedCanonicalPairs(fixture.entities));
    expect(normal.publications).toEqual(getExpectedCanonicalPublications(fixture.entities));
    expect(replay.publications).toEqual(getExpectedCanonicalPublications(fixture.entities));
  });
});
