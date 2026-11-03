import type {
  SpriteAnimationDefinition,
  SpriteAnimationEventDefinition,
  SpriteFrameRect
} from "@tiny-aster/core";

export interface AsepriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AsepriteFrameItem {
  frame: AsepriteRect;
  rotated?: boolean;
  trimmed?: boolean;
  spriteSourceSize?: AsepriteRect;
  sourceSize?: { w: number; h: number };
  duration?: number;
}

export interface AsepriteFrameTag {
  name: string;
  from: number;
  to: number;
  direction?: string;
  repeat?: string | number;
}

export interface AsepriteJsonData {
  frames: AsepriteFrameItem[] | Record<string, AsepriteFrameItem>;
  meta: {
    size?: { w: number; h: number };
    frameTags?: AsepriteFrameTag[];
  };
}

export interface ParseAsepriteOptions {
  /** Logical world-space dimensions. These must be explicit and stable across clips. */
  frameWidth: number;
  frameHeight: number;
  /** Shared normalized destination anchor. Defaults to bottom-center. */
  anchor?: { x: number; y: number };
  /** Fallback loop policy. Clip-name conventions apply when omitted. */
  defaultLoop?: boolean;
  /** Per-clip overrides, keyed by normalized tag name. */
  animationOverrides?: Readonly<Record<string, { loop?: boolean }>>;
  /** Events use zero-based indices in the final playback sequence after direction expansion. */
  eventsOverlay?: Readonly<Record<string, readonly SpriteAnimationEventDefinition[]>>;
}

export interface ParsedAsepriteSheet {
  frameWidth: number;
  frameHeight: number;
  anchor: { x: number; y: number };
  animations: Record<string, SpriteAnimationDefinition>;
}

const NON_LOOPING_TAG_NAMES = new Set([
  "attack",
  "hit",
  "hurt",
  "death",
  "die",
  "shoot",
  "jump_end",
  "land"
]);

const SUPPORTED_DIRECTIONS = new Set(["forward", "reverse", "pingpong"]);

function normalizeAnimationName(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
    throw new Error("Invalid Aseprite animation tag name: " + JSON.stringify(value) + ".");
  }
  return normalized;
}

function isPositiveInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

/** Deterministic natural ordering for Aseprite Hash frame keys (frame_2 before frame_10). */
function compareNaturalKeys(left: string, right: string): number {
  const leftParts = left.match(/\d+|\D+/g) ?? [left];
  const rightParts = right.match(/\d+|\D+/g) ?? [right];
  const sharedLength = Math.min(leftParts.length, rightParts.length);

  for (let index = 0; index < sharedLength; index++) {
    const leftPart = leftParts[index] ?? "";
    const rightPart = rightParts[index] ?? "";
    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);

    if (leftNumeric && rightNumeric) {
      const leftTrimmed = leftPart.replace(/^0+(?=\d)/, "");
      const rightTrimmed = rightPart.replace(/^0+(?=\d)/, "");
      if (leftTrimmed.length !== rightTrimmed.length) {
        return leftTrimmed.length - rightTrimmed.length;
      }
      if (leftTrimmed !== rightTrimmed) {
        return leftTrimmed < rightTrimmed ? -1 : 1;
      }
      if (leftPart.length !== rightPart.length) {
        return leftPart.length - rightPart.length;
      }
      continue;
    }

    if (leftPart !== rightPart) {
      return leftPart < rightPart ? -1 : 1;
    }
  }

  return leftParts.length - rightParts.length;
}

function readFrameList(frames: AsepriteJsonData["frames"]): AsepriteFrameItem[] {
  if (Array.isArray(frames)) {
    return [...frames];
  }

  return Object.entries(frames)
    .sort(([left], [right]) => compareNaturalKeys(left, right))
    .map(([, frame]) => frame);
}

function validateFrame(
  item: AsepriteFrameItem,
  index: number,
  atlasSize: { w: number; h: number }
): void {
  if (item.rotated === true) {
    throw new Error("Aseprite frame " + index + " is rotated; rotated frames are not supported.");
  }
  if (item.trimmed === true) {
    throw new Error("Aseprite frame " + index + " is trimmed; trimmed frames are not supported.");
  }

  const rect = item.frame;
  if (
    !rect ||
    ![rect.x, rect.y, rect.w, rect.h].every(Number.isFinite) ||
    !Number.isInteger(rect.x) ||
    !Number.isInteger(rect.y) ||
    !isPositiveInteger(rect.w) ||
    !isPositiveInteger(rect.h) ||
    rect.x < 0 ||
    rect.y < 0
  ) {
    throw new Error("Aseprite frame " + index + " has an invalid source rectangle.");
  }

  if (rect.x + rect.w > atlasSize.w || rect.y + rect.h > atlasSize.h) {
    throw new Error(
      "Aseprite frame " + index + " rectangle (" +
      [rect.x, rect.y, rect.w, rect.h].join(", ") +
      ") exceeds atlas bounds " + atlasSize.w + "x" + atlasSize.h + "."
    );
  }

  if (item.duration === undefined || !Number.isFinite(item.duration) || item.duration <= 0) {
    throw new Error("Aseprite frame " + index + " must declare a positive duration in milliseconds.");
  }

  if (item.sourceSize && (
    !isPositiveInteger(item.sourceSize.w) ||
    !isPositiveInteger(item.sourceSize.h)
  )) {
    throw new Error("Aseprite frame " + index + " has invalid sourceSize dimensions.");
  }

  if (item.spriteSourceSize && (
    !isNonNegativeInteger(item.spriteSourceSize.x) ||
    !isNonNegativeInteger(item.spriteSourceSize.y) ||
    !isPositiveInteger(item.spriteSourceSize.w) ||
    !isPositiveInteger(item.spriteSourceSize.h)
  )) {
    throw new Error("Aseprite frame " + index + " has invalid spriteSourceSize dimensions.");
  }

  if (item.sourceSize && item.spriteSourceSize) {
    const sourceRect = item.spriteSourceSize;
    if (
      sourceRect.x !== 0 ||
      sourceRect.y !== 0 ||
      sourceRect.w !== item.sourceSize.w ||
      sourceRect.h !== item.sourceSize.h
    ) {
      throw new Error(
        "Aseprite frame " + index +
        " contains trimmed source geometry; only untrimmed frames are supported."
      );
    }
  }
}

function getUniformFrameDuration(
  frames: readonly AsepriteFrameItem[],
  animationName: string
): number {
  const firstDuration = frames[0]?.duration;
  if (firstDuration === undefined || !Number.isFinite(firstDuration) || firstDuration <= 0) {
    throw new Error("Animation \"" + animationName + "\" has no valid frame duration.");
  }

  const differentDuration = frames.find((frame) => frame.duration !== firstDuration);
  if (differentDuration) {
    throw new Error(
      "Animation \"" + animationName +
      "\" has variable frame durations. SpriteAnimationDefinition currently supports one " +
      "frameDuration per clip; normalize the source timings before generation."
    );
  }

  return firstDuration / 1000;
}

function applyDirection(
  frames: readonly SpriteFrameRect[],
  direction: string | undefined,
  animationName: string
): SpriteFrameRect[] {
  const resolvedDirection = direction ?? "forward";
  if (!SUPPORTED_DIRECTIONS.has(resolvedDirection)) {
    throw new Error(
      "Animation \"" + animationName + "\" uses unsupported Aseprite direction \"" +
      resolvedDirection + "\"."
    );
  }

  if (resolvedDirection === "reverse") {
    return [...frames].reverse();
  }

  if (resolvedDirection === "pingpong") {
    return [...frames, ...frames.slice(1, -1).reverse()];
  }

  return [...frames];
}

function validateAnchor(anchor: { x: number; y: number }): void {
  if (
    !Number.isFinite(anchor.x) ||
    !Number.isFinite(anchor.y) ||
    anchor.x < 0 ||
    anchor.x > 1 ||
    anchor.y < 0 ||
    anchor.y > 1
  ) {
    throw new Error("Sprite anchor coordinates must be finite normalized values in [0, 1].");
  }
}

function resolveEvents(
  animationName: string,
  frameCount: number,
  eventsOverlay: ParseAsepriteOptions["eventsOverlay"]
): SpriteAnimationEventDefinition[] | undefined {
  const events = eventsOverlay?.[animationName];
  if (events === undefined || events.length === 0) {
    return undefined;
  }

  return events.map((event, index) => {
    if (
      !event ||
      !Number.isInteger(event.frame) ||
      event.frame < 0 ||
      event.frame >= frameCount
    ) {
      throw new Error(
        "Animation \"" + animationName + "\" event " + index +
        " has an invalid frame index; expected 0.." + (frameCount - 1) + "."
      );
    }
    if (typeof event.type !== "string" || event.type.trim().length === 0) {
      throw new Error(
        "Animation \"" + animationName + "\" event " + index +
        " must declare a non-empty type."
      );
    }
    if (
      event.payload !== undefined &&
      (typeof event.payload !== "object" || event.payload === null || Array.isArray(event.payload))
    ) {
      throw new Error(
        "Animation \"" + animationName + "\" event " + index +
        " payload must be an object when provided."
      );
    }

    return {
      frame: event.frame,
      type: event.type,
      ...(event.payload === undefined ? {} : { payload: { ...event.payload } })
    };
  });
}

function assertKnownClipKeys(
  values: Readonly<Record<string, unknown>> | undefined,
  knownAnimations: ReadonlySet<string>,
  label: string
): void {
  for (const key of Object.keys(values ?? {})) {
    const normalized = normalizeAnimationName(key);
    if (!knownAnimations.has(normalized)) {
      throw new Error(label + " references unknown animation \"" + key + "\".");
    }
  }
}

/**
 * Parse the metadata portion of an Aseprite JSON export.
 *
 * This is build-time tooling: the returned data is an intermediate description,
 * not a runtime SpriteSheetDefinition. The generator adds assetPath and a
 * statically analyzable Metro require() when it emits the canonical definition.
 */
export function parseAsepriteJson(
  raw: AsepriteJsonData | string,
  options: ParseAsepriteOptions
): ParsedAsepriteSheet {
  const data: AsepriteJsonData = typeof raw === "string"
    ? JSON.parse(raw)
    : raw;

  if (!data || typeof data !== "object" || !data.frames || !data.meta) {
    throw new Error("Invalid Aseprite JSON: expected frames and meta objects.");
  }

  if (
    !isPositiveInteger(options.frameWidth) ||
    !isPositiveInteger(options.frameHeight)
  ) {
    throw new Error("frameWidth and frameHeight must be explicit positive integer logical dimensions.");
  }

  const atlasSize = data.meta.size;
  if (
    !atlasSize ||
    !isPositiveInteger(atlasSize.w) ||
    !isPositiveInteger(atlasSize.h)
  ) {
    throw new Error("Aseprite JSON must declare positive meta.size width and height.");
  }

  const anchor = options.anchor ?? { x: 0.5, y: 1 };
  validateAnchor(anchor);

  const frameList = readFrameList(data.frames);
  if (frameList.length === 0) {
    throw new Error("Invalid Aseprite JSON: frames collection is empty.");
  }

  frameList.forEach((frame, index) => validateFrame(frame, index, atlasSize));

  const tags = data.meta.frameTags ?? [];
  const animations: Record<string, SpriteAnimationDefinition> = {};
  const declaredAnimationNames = new Set<string>();

  if (tags.length === 0) {
    const frameDuration = getUniformFrameDuration(frameList, "default");
    const frames = frameList.map((item) => ({ ...item.frame }));
    animations.default = {
      name: "default",
      frames,
      frameDuration,
      loop: options.defaultLoop ?? true,
      events: resolveEvents("default", frames.length, options.eventsOverlay)
    };
    declaredAnimationNames.add("default");
  } else {
    for (const tag of tags) {
      const animationName = normalizeAnimationName(tag.name);

      if (declaredAnimationNames.has(animationName)) {
        throw new Error("Aseprite contains duplicate animation tag \"" + animationName + "\".");
      }
      declaredAnimationNames.add(animationName);

      if (
        !Number.isInteger(tag.from) ||
        !Number.isInteger(tag.to) ||
        tag.from < 0 ||
        tag.to < tag.from ||
        tag.to >= frameList.length
      ) {
        throw new Error(
          "Invalid frameTag range for \"" + tag.name +
          "\": expected integer indices within 0.." + (frameList.length - 1) + "."
        );
      }

      if (tag.repeat !== undefined) {
        throw new Error(
          "Animation \"" + animationName +
          "\" declares Aseprite repeat metadata; finite repeat counts are not represented by the current runtime contract."
        );
      }

      const taggedItems = frameList.slice(tag.from, tag.to + 1);
      const frameDuration = getUniformFrameDuration(taggedItems, animationName);
      const sourceFrames = taggedItems.map((item) => ({ ...item.frame }));
      const frames = applyDirection(sourceFrames, tag.direction, animationName);
      const configuredLoop = options.animationOverrides?.[animationName]?.loop;
      const loop = configuredLoop ??
        options.defaultLoop ??
        !NON_LOOPING_TAG_NAMES.has(animationName);

      animations[animationName] = {
        name: animationName,
        frames,
        frameDuration,
        loop,
        events: resolveEvents(animationName, frames.length, options.eventsOverlay)
      };
    }
  }

  assertKnownClipKeys(options.animationOverrides, declaredAnimationNames, "animationOverrides");
  assertKnownClipKeys(options.eventsOverlay, declaredAnimationNames, "eventsOverlay");

  return {
    frameWidth: options.frameWidth,
    frameHeight: options.frameHeight,
    anchor: { x: anchor.x, y: anchor.y },
    animations
  };
}
