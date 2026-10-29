import { ArkanoidGame } from "../ArkanoidGame";
import { spawnBlueprintEntity } from "@tiny-aster/core";
import type { Component, WorldSnapshot } from "@tiny-aster/core";

type AuditedComponentType = "Brick" | "Health";
type FixtureProfile = "default-optionals" | "filled-optionals";
type RoundTripRoute = "AoS" | "SoA" | "JSON";
type RestoredValueMode = "null" | "zero" | "omitted";

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

const COMPONENT_TYPES: readonly AuditedComponentType[] = ["Brick", "Health"];
const FIXTURE_PROFILES: readonly FixtureProfile[] = ["default-optionals", "filled-optionals"];
const ROUTES: readonly RoundTripRoute[] = ["AoS", "SoA", "JSON"];

const ALL_CASES: readonly RoundTripCase[] = COMPONENT_TYPES.flatMap(componentType =>
  FIXTURE_PROFILES.flatMap(profile =>
    ROUTES.map(route => ({ componentType, profile, route }))
  )
);

function caseKey(testCase: RoundTripCase): string {
  return `${testCase.componentType}|${testCase.profile}|${testCase.route}`;
}

function expectedFieldLosses(testCase: RoundTripCase): readonly ExpectedFieldLoss[] {
  if (testCase.route === "JSON") {
    if (testCase.componentType === "Health") {
      return [{ field: "invulnerableRemaining", mode: "null" }];
    }
    const losses: ExpectedFieldLoss[] = [
      { field: "hp", mode: "null" },
      { field: "maxHp", mode: "null" }
    ];
    if (testCase.profile === "default-optionals") {
      losses.push(
        { field: "powerUp", mode: "omitted" },
        { field: "row", mode: "omitted" }
      );
    }
    return losses;
  }

  if (
    testCase.route === "SoA" &&
    testCase.componentType === "Brick" &&
    testCase.profile === "default-optionals"
  ) {
    return [
      { field: "powerUp", mode: "zero" },
      { field: "row", mode: "zero" }
    ];
  }

  return [];
}

function getRequiredComponent(
  game: ArkanoidGame,
  entityId: number,
  componentType: AuditedComponentType
): Component {
  const component = game.world.getComponent(entityId, componentType);
  if (!component) {
    throw new Error(`Arkanoid factory fixture is missing ${componentType}.`);
  }
  return component;
}

async function roundTripProfile(
  profile: FixtureProfile,
  route: RoundTripRoute
): Promise<ReadonlyArray<readonly [RoundTripCase, RoundTripResult]>> {
  const game = new ArkanoidGame({ headless: true, seed: 240719 });
  await game.init();

  try {
    const isFilled = profile === "filled-optionals";
    const entityId = spawnBlueprintEntity(game.world, "brick", {
      x: 120,
      y: 180,
      kind: "gold",
      ...(isFilled
        ? {
            color: "gold",
            hp: Number.POSITIVE_INFINITY,
            points: 250,
            powerUp: "E",
            row: 3
          }
        : {})
    });
    game.world.flush();

    const originals = new Map<AuditedComponentType, Component>([
      ["Brick", getRequiredComponent(game, entityId, "Brick")],
      ["Health", getRequiredComponent(game, entityId, "Health")]
    ]);

    game.world.setResource("UseSoASnapshots", route === "SoA");
    const snapshot = game.world.snapshot();
    const transportedSnapshot: WorldSnapshot =
      route === "JSON"
        ? (JSON.parse(JSON.stringify(snapshot)) as WorldSnapshot)
        : snapshot;

    game.world.restore(transportedSnapshot);

    return COMPONENT_TYPES.map(componentType => {
      const original = originals.get(componentType);
      if (!original) {
        throw new Error(`Arkanoid fixture did not create ${componentType}.`);
      }
      const restored = getRequiredComponent(game, entityId, componentType);
      const testCase: RoundTripCase = { componentType, profile, route };
      return [testCase, { original, restored }] as const;
    });
  } finally {
    game.destroy();
  }
}

/**
 * All factory calls and route restores are completed in beforeAll. Setup/restore
 * exceptions fail the suite before the it.failing tests run, and therefore cannot
 * masquerade as the expected data-loss assertion.
 */
let roundTripResults: Map<string, RoundTripResult>;

const EXPECTED_DATA_LOSSES = ALL_CASES.filter(
  testCase => expectedFieldLosses(testCase).length > 0
);

beforeAll(async () => {
  roundTripResults = new Map();

  for (const profile of FIXTURE_PROFILES) {
    for (const route of ROUTES) {
      const entries = await roundTripProfile(profile, route);
      for (const [testCase, result] of entries) {
        roundTripResults.set(caseKey(testCase), result);
      }
    }
  }
});

function getResult(testCase: RoundTripCase): RoundTripResult {
  const result = roundTripResults.get(caseKey(testCase));
  if (!result) {
    throw new Error(`No precomputed Arkanoid result for ${caseKey(testCase)}.`);
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

    if (loss.field === "powerUp" || loss.field === "row") {
      expect(originalRecord[loss.field]).toBeUndefined();
    } else {
      expect(originalRecord[loss.field]).toBe(Number.POSITIVE_INFINITY);
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

  // The restored object must differ only by the expected JSON / SoA coercions.
  expect(restoredRecord).toStrictEqual(expectedRestored);
  expect(restored).not.toStrictEqual(original);
}

describe("Arkanoid factory component round-trip audit", () => {
  test.each(COMPONENT_TYPES)("%s: AoS, SoA and JSON", componentType => {
    for (const profile of FIXTURE_PROFILES) {
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
      // Strict-equality only; the real blueprint fixture and restore ran in beforeAll.
      expect(restored).toStrictEqual(original);
    }
  );
});
