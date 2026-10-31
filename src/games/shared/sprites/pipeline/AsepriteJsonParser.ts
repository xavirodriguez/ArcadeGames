import type {
  SpriteAnimationDefinition,
  SpriteAnimationEventDefinition,
  SpriteFrameRect,
  SpriteSheetDefinition
} from "@tiny-aster/core";

export interface AsepriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AsepriteFrameItem {
  filename?: string;
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

export interface AsepriteSliceKey {
  frame: number;
  bounds: AsepriteRect;
  pivot?: { x: number; y: number };
}

export interface AsepriteSlice {
  name: string;
  color?: string;
  keys?: AsepriteSliceKey[];
  data?: string;
}

export interface AsepriteJsonData {
  frames: AsepriteFrameItem[] | Record<string, AsepriteFrameItem>;
  meta: {
    app?: string;
    version?: string;
    image?: string;
    format?: string;
    size?: { w: number; h: number };
    scale?: string;
    frameTags?: AsepriteFrameTag[];
    slices?: AsepriteSlice[];
  };
}

export interface ParseAsepriteOptions {
  id: string;
  assetPath: string;
  frameWidth?: number;
  frameHeight?: number;
  anchor?: { x: number; y: number };
  defaultLoop?: boolean;
  eventsOverlay?: Record<string, SpriteAnimationEventDefinition[]>;
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

/**
 * Pure parser converting raw Aseprite JSON export to canonical SpriteSheetDefinition.
 */
export function parseAsepriteJson(
  raw: AsepriteJsonData | string,
  options: ParseAsepriteOptions
): SpriteSheetDefinition {
  const data: AsepriteJsonData = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (!data || typeof data !== "object") {
    throw new Error("Invalid Aseprite JSON data: expected an object.");
  }
  if (!data.frames) {
    throw new Error("Invalid Aseprite JSON: missing 'frames' property.");
  }

  const frameList: AsepriteFrameItem[] = Array.isArray(data.frames)
    ? data.frames
    : Object.values(data.frames);

  if (frameList.length === 0) {
    throw new Error("Invalid Aseprite JSON: 'frames' array/object is empty.");
  }

  const tags = data.meta?.frameTags ?? [];
  const animations: Record<string, SpriteAnimationDefinition> = {};

  if (tags.length === 0) {
    const frames: SpriteFrameRect[] = frameList.map((f) => ({
      x: f.frame.x,
      y: f.frame.y,
      w: f.frame.w,
      h: f.frame.h
    }));
    const avgDurationMs =
      frameList.reduce((acc, f) => acc + (f.duration ?? 100), 0) / frameList.length;
    const durationSec = Math.max(0.01, Math.round((avgDurationMs / 1000) * 1000) / 1000);

    animations.default = {
      name: "default",
      frames,
      frameDuration: durationSec,
      loop: options.defaultLoop ?? true,
      events: options.eventsOverlay?.default
    };
  } else {
    for (const tag of tags) {
      const tagName = tag.name.toLowerCase().trim();
      const from = Math.max(0, tag.from);
      const to = Math.min(frameList.length - 1, tag.to);

      if (from > to) {
        throw new Error(
          `Invalid frameTag range for "${tag.name}": from (${tag.from}) > to (${tag.to}).`
        );
      }

      const taggedFrames = frameList.slice(from, to + 1);
      const frames: SpriteFrameRect[] = taggedFrames.map((f) => ({
        x: f.frame.x,
        y: f.frame.y,
        w: f.frame.w,
        h: f.frame.h
      }));

      const avgDurationMs =
        taggedFrames.reduce((acc, f) => acc + (f.duration ?? 100), 0) /
        taggedFrames.length;
      const durationSec =
        Math.max(0.01, Math.round((avgDurationMs / 1000) * 1000) / 1000);

      const loop = options.defaultLoop !== undefined
        ? options.defaultLoop
        : !NON_LOOPING_TAG_NAMES.has(tagName);

      const events: SpriteAnimationEventDefinition[] = [
        ...(options.eventsOverlay?.[tagName] ?? [])
      ];

      // Extract events from slices matching the tag frame range if any
      if (data.meta?.slices) {
        for (const slice of data.meta.slices) {
          if (!slice.keys) continue;
          for (const key of slice.keys) {
            if (key.frame >= from && key.frame <= to) {
              const relativeFrame = key.frame - from;
              // Avoid duplicates if already present in overlay
              const alreadyPresent = events.some(
                (e) => e.frame === relativeFrame && e.type === slice.name
              );
              if (!alreadyPresent) {
                events.push({
                  frame: relativeFrame,
                  type: slice.name,
                  payload: { bounds: key.bounds }
                });
              }
            }
          }
        }
      }

      animations[tagName] = {
        name: tagName,
        frames,
        frameDuration: durationSec,
        loop,
        events: events.length > 0 ? events : undefined
      };
    }
  }

  // Derive logical frame dimensions if not explicitly given
  const firstFrame = frameList[0].frame;
  const frameWidth = options.frameWidth ?? firstFrame.w;
  const frameHeight = options.frameHeight ?? firstFrame.h;

  return {
    id: options.id,
    assetPath: options.assetPath,
    imageSource: null,
    frameWidth,
    frameHeight,
    sourceMode: "frames",
    anchor: options.anchor ?? { x: 0.5, y: 1 },
    animations
  };
}
