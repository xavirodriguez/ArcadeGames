import type { Component } from "../../ecs/Component";
import { EntityBuilder } from "../../ecs/EntityBuilder";
import { World } from "../../ecs/World";
import type { ReclaimableComponent } from "../../ecs/CoreComponents";
import { ComponentSetPool } from "../../utils/ComponentSetPool";
import { ShapeType } from "../../physics/shapes/Shapes";
import type { WorldSnapshot } from "../WorldSnapshot";

type AuditedComponentType =
  | "Transform"
  | "Velocity"
  | "Render"
  | "Collider"
  | "TTL"
  | "CollisionEvents"
  | "Reclaimable";

type FixtureProfile = "default-optionals" | "filled-optionals";
type RoundTripRoute = "AoS" | "SoA" | "JSON";
type RestoredValueMode = "zero" | "null" | "omitted";

interface ExpectedFieldLoss {
  field: string;
  mode: RestoredValueMode;
}

interface RoundTripCase {
  componentType: AuditedComponentType;
  profile: FixtureProfile;
  route: RoundTripRoute;
}

interface RoundTripResult {
  original: Component;
  restored: Component;
}

interface FixtureWorld {
  world: World;
  entityId: number;
}

interface ReclaimableFixtureSet extends Record<string, Component> {
  Reclaimable: ReclaimableComponent;
}

const COMPONENT_TYPES: readonly AuditedComponentType[] = [
  "Transform",
  "Velocity",
  "Render",
  "Collider",
  "TTL",
  "CollisionEvents",
  "Reclaimable"
];

const ALL_PROFILES: readonly FixtureProfile[] = [
  "default-optionals",
  "filled-optionals"
];

const ROUTES: readonly RoundTripRoute[] = ["AoS", "SoA", "JSON"];

function profilesFor(componentType: AuditedComponentType): readonly FixtureProfile[] {
  // ComponentSetPool installs onReclaim at acquire time, so its realistic fixture
  // always represents the populated callback path; it has no configurable optionals.
  return componentType === "Reclaimable" ? ["filled-optionals"] : ALL_PROFILES;
}

const ALL_CASES: readonly RoundTripCase[] = COMPONENT_TYPES.flatMap(componentType =>
  profilesFor(componentType).flatMap(profile =>
    ROUTES.map(route => ({ componentType, profile, route }))
  )
);

/**
 * EntityBuilder writes these optional fields as own properties with value undefined.
 * SoA turns them into zero (SnapshotSerializerSoA.ts:101-104,
 * SoADeserializer.ts:32-42); JSON.stringify removes them.
 */
const UNDEFINED_OPTIONAL_FIELDS: Partial<Record<AuditedComponentType, readonly string[]>> = {
  Transform: ["parentEntity"],
  Render: ["spriteId", "color", "shape", "size"],
  Collider: ["offsetX", "offsetY"],
  TTL: ["onCompleteEvent"]
};

function createBuilderWorld(profile: FixtureProfile): FixtureWorld {
  const world = new World();
  const isFilled = profile === "filled-optionals";
  const parentEntity = isFilled ? world.createEntity() : undefined;

  const entityId = EntityBuilder.create(world)
    .withTransform({
      x: 120,
      y: 200,
      ...(isFilled && parentEntity !== undefined ? { parentEntity } : {})
    })
    .withVelocity({ vx: 12, vy: -8, angularVelocity: 0.25 })
    .withRender({
      visible: true,
      opacity: 0.85,
      order: 4,
      rotation: 0.1,
      angularVelocity: 0.05,
      hitFlashFrames: 2,
      muzzleFlashFrames: 3,
      ...(isFilled
        ? {
            spriteId: "audit-player",
            color: "#ffffff",
            shape: "circle",
            size: 18
          }
        : {})
    })
    .withCollider({
      shape: { type: ShapeType.Box, width: 20, height: 12 },
      layer: 1,
      mask: 2,
      enabled: true,
      isTrigger: false,
      ...(isFilled ? { offsetX: 2, offsetY: -1 } : {})
    })
    .withTTL(1.5, isFilled ? "audit:expired" : undefined)
    .withCollisionEvents()
    .build();

  // Builder mutations are buffered; flush before filling Render's extra optional
  // properties or reading any component from the world.
  world.flush();

  if (isFilled) {
    const mutated = world.mutateComponent(entityId, "Render", component => {
      component.dangerPulseIntensity = 0.35;
      component.depthSort = true;
      component.ignoreCamera = true;
    });
    if (!mutated) {
      throw new Error("Render fixture was not created by EntityBuilder.");
    }
  }

  return { world, entityId };
}

function createReclaimableWorld(): FixtureWorld {
  const world = new World();
  const pool = new ComponentSetPool<ReclaimableFixtureSet>(
    () => ({
      Reclaimable: {
        type: "Reclaimable",
        poolName: "component-roundtrip-audit",
        poolId: "component-roundtrip-audit-1"
      }
    }),
    () => undefined,
    0
  );

  // acquire() is the real factory path that attaches the onReclaim callback.
  const { entity } = pool.acquire(world);
  world.flush();
  return { world, entityId: entity };
}

function createFactoryWorld(
  componentType: AuditedComponentType,
  profile: FixtureProfile
): FixtureWorld {
  return componentType === "Reclaimable"
    ? createReclaimableWorld()
    : createBuilderWorld(profile);
}

function getRequiredComponent(
  world: World,
  entityId: number,
  componentType: AuditedComponentType
): Component {
  const component = world.getComponent(entityId, componentType);
  if (!component) {
    throw new Error(`Factory fixture is missing ${componentType}.`);
  }
  return component;
}

function roundTrip(testCase: RoundTripCase): RoundTripResult {
  const { world, entityId } = createFactoryWorld(testCase.componentType, testCase.profile);
  const original = getRequiredComponent(world, entityId, testCase.componentType);

  world.setResource("UseSoASnapshots", testCase.route === "SoA");
  const snapshot = world.snapshot();
  const transportedSnapshot: WorldSnapshot =
    testCase.route === "JSON"
      ? (JSON.parse(JSON.stringify(snapshot)) as WorldSnapshot)
      : snapshot;

  world.restore(transportedSnapshot);
  const restored = getRequiredComponent(world, entityId, testCase.componentType);
  return { original, restored };
}

function caseKey(testCase: RoundTripCase): string {
  return `${testCase.componentType}|${testCase.profile}|${testCase.route}`;
}

function expectedFieldLosses(testCase: RoundTripCase): readonly ExpectedFieldLoss[] {
  if (testCase.componentType === "Reclaimable") {
    // Snapshot serializers intentionally skip function-valued fields.
    return [{ field: "onReclaim", mode: "omitted" }];
  }

  if (testCase.profile !== "default-optionals" || testCase.route === "AoS") {
    return [];
  }

  const fields = UNDEFINED_OPTIONAL_FIELDS[testCase.componentType] ?? [];
  return fields.map(field => ({
    field,
    mode: testCase.route === "SoA" ? "zero" : "omitted"
  }));
}

/**
 * Precompute every fixture and restore before the it.failing assertions. Thus an
 * exception during construction, snapshot, or restore fails before expected-failure
 * tests begin and cannot be misreported as data loss.
 */
let roundTripResults: Map<string, RoundTripResult>;

const EXPECTED_DATA_LOSSES = ALL_CASES.filter(
  testCase => expectedFieldLosses(testCase).length > 0
);

beforeAll(() => {
  roundTripResults = new Map(
    ALL_CASES.map(testCase => [caseKey(testCase), roundTrip(testCase)])
  );
});

function getResult(testCase: RoundTripCase): RoundTripResult {
  const result = roundTripResults.get(caseKey(testCase));
  if (!result) {
    throw new Error(`No precomputed round-trip result for ${caseKey(testCase)}.`);
  }
  return result;
}

function expectCharacterizedLoss(
  original: Component,
  restored: Component,
  fields: readonly ExpectedFieldLoss[]
): void {
  const originalRecord: Record<string, unknown> = { ...original };
  const restoredRecord: Record<string, unknown> = { ...restored };
  const expectedRestored: Record<string, unknown> = { ...originalRecord };

  for (const loss of fields) {
    expect(Object.prototype.hasOwnProperty.call(originalRecord, loss.field)).toBe(true);

    if (loss.field === "onReclaim") {
      expect(typeof originalRecord[loss.field]).toBe("function");
    } else {
      expect(originalRecord[loss.field]).toBeUndefined();
    }

    if (loss.mode === "zero") {
      expect(Object.prototype.hasOwnProperty.call(restoredRecord, loss.field)).toBe(true);
      expect(restoredRecord[loss.field]).toBe(0);
      expectedRestored[loss.field] = 0;
    } else if (loss.mode === "null") {
      expect(Object.prototype.hasOwnProperty.call(restoredRecord, loss.field)).toBe(true);
      expect(restoredRecord[loss.field]).toBeNull();
      expectedRestored[loss.field] = null;
    } else {
      expect(Object.prototype.hasOwnProperty.call(restoredRecord, loss.field)).toBe(false);
      delete expectedRestored[loss.field];
    }
  }

  // Require that the only differences are the fields explicitly identified above.
  expect(restoredRecord).toStrictEqual(expectedRestored);
  expect(restored).not.toStrictEqual(original);
}

describe("Component snapshot / restore round-trip audit (factory-created core components)", () => {
  test.each(COMPONENT_TYPES)("%s: AoS, SoA and JSON", componentType => {
    for (const profile of profilesFor(componentType)) {
      for (const route of ROUTES) {
        const testCase: RoundTripCase = { componentType, profile, route };
        const { original, restored } = getResult(testCase);
        const losses = expectedFieldLosses(testCase);

        if (losses.length > 0) {
          expectCharacterizedLoss(original, restored, losses);
        } else {
          expect(restored).toStrictEqual(original);
        }
      }
    }
  });

  it.failing.each(EXPECTED_DATA_LOSSES)(
    "$componentType / $profile / $route should preserve all source fields",
    testCase => {
      const { original, restored } = getResult(testCase);
      // Strict-equality only: fixture creation and restore already ran in beforeAll.
      expect(restored).toStrictEqual(original);
    }
  );
});
