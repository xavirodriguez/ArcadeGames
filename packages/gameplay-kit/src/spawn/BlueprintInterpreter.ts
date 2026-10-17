import { World } from "@tiny-aster/core";
import { EntityBlueprintDef } from "./EntityBlueprintSchema";

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

/**
 * Resolves expression strings such as "$args.x", "$config.BULLET_SPEED", or "$random(10, 50)".
 * Uses world.gameplayRandom for deterministic pseudorandom evaluation.
 */
export function evaluateExpression(value: unknown, world: World, args: Record<string, unknown> = {}): unknown {
  if (typeof value !== "string") {
    if (Array.isArray(value)) {
      return value.map((item) => evaluateExpression(item, world, args));
    }
    if (isRecord(value)) {
      const res: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        res[k] = evaluateExpression(v, world, args);
      }
      return res;
    }
    return value;
  }

  const str = value.trim();

  // Handle $args.<prop>
  if (str.startsWith("$args.")) {
    const propPath = str.slice(6).split(".");
    let curr: unknown = args;
    for (const key of propPath) {
      if (!isRecord(curr)) return undefined;
      curr = curr[key];
    }
    return curr;
  }

  // Handle $config.<prop>
  if (str.startsWith("$config.")) {
    const config = world.getResource<Record<string, unknown>>("GameConfig") || {};
    const propPath = str.slice(8).split(".");
    let curr: unknown = config;
    for (const key of propPath) {
      if (!isRecord(curr)) return undefined;
      curr = curr[key];
    }
    return curr;
  }

  // Handle $random(min, max)
  const randMatch = str.match(/^\$random\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/);
  if (randMatch) {
    const min = parseFloat(randMatch[1]);
    const max = parseFloat(randMatch[2]);
    return world.gameplayRandom.next() * (max - min) + min;
  }

  return value;
}

/**
 * Evaluates conditional "when" predicate strings.
 * Examples: "mode === 'story'", "args.hasShield", "config.USE_SPRITES"
 */
export function evaluateCondition(when: string | undefined, world: World, args: Record<string, unknown> = {}): boolean {
  if (!when) return true;

  const rawState = world.getSingleton("GameState");
  const gameState: Record<string, unknown> = isRecord(rawState) ? rawState : {};
  const config = world.getResource<Record<string, unknown>>("GameConfig") || {};

  const context = {
    mode: gameState.mode,
    args,
    config,
    world
  };

  try {
    const keys = Object.keys(context);
    const vals = Object.values(context);
    const fn = new Function(...keys, `return Boolean(${when});`);
    return fn(...vals);
  } catch (_e) {
    return false;
  }
}

/**
 * Interpreter that creates an entity from an EntityBlueprintDef object.
 * Resolves expressions, checks conditions, attaches components & tags, and emits onSpawn events.
 * @public
 */
export function spawnFromBlueprint(
  world: World,
  def: EntityBlueprintDef,
  args: Record<string, unknown> = {},
  existingEntity?: number
): number {
  const entity = existingEntity ?? world.createEntity();

  // Attach tags
  if (def.tags && def.tags.length > 0) {
    const existingTag = world.getComponent(entity, "Tag");
    if (existingTag) {
      const merged = Array.from(new Set([...existingTag.tags, ...def.tags]));
      world.addComponent(entity, { ...existingTag, tags: merged });
    } else {
      world.addComponent(entity, {
        type: "Tag",
        tags: [...def.tags]
      });
    }
  }

  // Process components
  for (const compSpec of def.components) {
    if (compSpec.when && !evaluateCondition(compSpec.when, world, args)) {
      continue;
    }

    const evaluatedProps = evaluateExpression(compSpec.props, world, args) || {};
    const componentData = {
      type: compSpec.type,
      ...evaluatedProps
    };

    world.addComponent(entity, componentData);
  }

  // Handle onSpawn events
  if (def.onSpawn) {
    const eventBus = world.getEventBus();
    if (eventBus) {
      for (const spawnEvent of def.onSpawn) {
        const payload = evaluateExpression(spawnEvent.payload, world, { ...args, entity }) || { entity };
        eventBus.emitDeferred(spawnEvent.event, payload);
      }
    }
  }

  return entity;
}
